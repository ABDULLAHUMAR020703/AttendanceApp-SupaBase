import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  UIManager,
  View,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Platform-correct KeyboardAvoidingView behavior.
 * - iOS: padding
 * - Android screens: undefined (windowSoftInputMode=adjustResize)
 * - Android modals: padding (Modals do not receive Activity adjustResize)
 */
export function getKeyboardAvoidingBehavior({ inModal = false } = {}) {
  if (Platform.OS === 'ios') return 'padding';
  if (inModal) return 'padding';
  return undefined;
}

/** @deprecated use getKeyboardAvoidingBehavior() */
export const keyboardAvoidingBehavior =
  Platform.OS === 'ios' ? 'padding' : undefined;

/** Shared ScrollView props so focused TextInputs stay reachable. */
export const formScrollViewProps = {
  keyboardShouldPersistTaps: 'handled',
  keyboardDismissMode: Platform.OS === 'ios' ? 'interactive' : 'on-drag',
  automaticallyAdjustKeyboardInsets: true,
};

const EXTRA_GAP = 28;

/**
 * Live keyboard bottom inset (height overlapping the window).
 * Useful when you cannot wrap the whole screen in KeyboardAwareScreen.
 */
export function useKeyboardBottomInset() {
  const [bottom, setBottom] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      setBottom(e?.endCoordinates?.height || 0);
    };
    const onHide = () => setBottom(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return bottom;
}

function scrollFocusedIntoView({
  scrollRef,
  scrollYRef,
  focusedHandle,
  keyboardHeight,
  extraGap = EXTRA_GAP,
}) {
  if (!scrollRef.current || !focusedHandle || keyboardHeight <= 0) return;

  const scrollNode = findNodeHandle(scrollRef.current);
  if (!scrollNode) return;

  UIManager.measureInWindow(focusedHandle, (_fx, fy, _fw, fh) => {
    UIManager.measureInWindow(scrollNode, (_sx, _sy, _sw, _sh) => {
      const windowHeight = Dimensions.get('window').height;
      const visibleBottom = windowHeight - keyboardHeight - extraGap;
      const fieldBottom = fy + fh;
      if (fieldBottom <= visibleBottom) return;

      const delta = fieldBottom - visibleBottom;
      const nextY = Math.max(0, (scrollYRef.current || 0) + delta);
      scrollRef.current?.scrollTo({ y: nextY, animated: true });
    });
  });
}

/**
 * Production keyboard-safe screen / form wrapper.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {object} [props.style] - KeyboardAvoidingView style
 * @param {object|object[]} [props.contentContainerStyle] - ScrollView content style
 * @param {boolean} [props.scroll=true]
 * @param {boolean} [props.inModal=false] - Use modal-safe Android behavior
 * @param {number} [props.keyboardVerticalOffset] - Override; default uses safe-area + header
 * @param {number} [props.headerHeight=0] - Nav header height to include in offset (iOS/modals)
 * @param {number} [props.extraScrollHeight=24] - Extra bottom padding inside the form
 * @param {boolean} [props.bounces]
 * @param {object} [props.scrollViewProps] - Extra ScrollView props
 * @param {React.Ref} [props.scrollRef] - Optional external scroll ref
 */
export function KeyboardAwareScreen({
  children,
  style,
  contentContainerStyle,
  scroll = true,
  inModal = false,
  keyboardVerticalOffset,
  headerHeight = 0,
  extraScrollHeight = 24,
  bounces = true,
  scrollViewProps,
  scrollRef: externalScrollRef,
}) {
  const insets = useSafeAreaInsets();
  const keyboardBottom = useKeyboardBottomInset();
  const internalScrollRef = useRef(null);
  const scrollRef = externalScrollRef || internalScrollRef;
  const scrollYRef = useRef(0);
  const focusedHandleRef = useRef(null);
  const focusTimeoutRef = useRef(null);

  const resolvedOffset = useMemo(() => {
    if (typeof keyboardVerticalOffset === 'number') return keyboardVerticalOffset;
    // Screens already inside SafeAreaView usually pass headerHeight only.
    // Modals / bare screens need top inset + optional header.
    const top = inModal ? 0 : insets.top;
    if (Platform.OS === 'ios') {
      return top + headerHeight;
    }
    // Android modal: small offset so padding behavior clears status/nav chrome
    return inModal ? headerHeight : 0;
  }, [keyboardVerticalOffset, inModal, insets.top, headerHeight]);

  const behavior = getKeyboardAvoidingBehavior({ inModal });

  const ensureFocusedVisible = useCallback(() => {
    scrollFocusedIntoView({
      scrollRef,
      scrollYRef,
      focusedHandle: focusedHandleRef.current,
      keyboardHeight: keyboardBottom,
      extraGap: EXTRA_GAP + (inModal ? insets.bottom : 0),
    });
  }, [keyboardBottom, scrollRef, inModal, insets.bottom]);

  useEffect(() => {
    if (keyboardBottom > 0) {
      // Wait a frame so layout settles after keyboard animation / adjustResize
      const t = setTimeout(ensureFocusedVisible, Platform.OS === 'ios' ? 50 : 100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [keyboardBottom, ensureFocusedVisible]);

  const onScroll = useCallback((e) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    scrollViewProps?.onScroll?.(e);
  }, [scrollViewProps]);

  const onFocusCapture = useCallback(
    (e) => {
      const handle = findNodeHandle(e.target);
      if (handle) {
        focusedHandleRef.current = handle;
        if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = setTimeout(() => {
          ensureFocusedVisible();
        }, Platform.OS === 'ios' ? 80 : 150);
      }
      scrollViewProps?.onFocusCapture?.(e);
    },
    [ensureFocusedVisible, scrollViewProps]
  );

  useEffect(
    () => () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    },
    []
  );

  // Keep submit buttons reachable: keyboard height + safe area + cushion
  const bottomPad =
    extraScrollHeight +
    (keyboardBottom > 0 ? Math.max(keyboardBottom * 0.15, 12) : 0) +
    (inModal ? insets.bottom : 0);

  const inner = scroll ? (
    <ScrollView
      ref={scrollRef}
      {...formScrollViewProps}
      {...scrollViewProps}
      bounces={bounces}
      showsVerticalScrollIndicator={scrollViewProps?.showsVerticalScrollIndicator ?? false}
      contentContainerStyle={[
        { flexGrow: 1, paddingBottom: bottomPad },
        contentContainerStyle,
      ]}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onFocusCapture={onFocusCapture}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[{ flex: 1, paddingBottom: bottomPad }, contentContainerStyle]}
      onFocusCapture={onFocusCapture}
    >
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={behavior}
      keyboardVerticalOffset={resolvedOffset}
    >
      {inner}
    </KeyboardAvoidingView>
  );
}

/**
 * Modal body helper — same keyboard rules as KeyboardAwareScreen with inModal.
 * Place inside <Modal><KeyboardAwareModal .../></Modal>.
 */
export function KeyboardAwareModal({
  children,
  style,
  contentContainerStyle,
  scroll = true,
  headerHeight = 0,
  extraScrollHeight = 32,
  scrollViewProps,
}) {
  return (
    <KeyboardAwareScreen
      inModal
      scroll={scroll}
      style={style}
      contentContainerStyle={contentContainerStyle}
      headerHeight={headerHeight}
      extraScrollHeight={extraScrollHeight}
      scrollViewProps={scrollViewProps}
    >
      {children}
    </KeyboardAwareScreen>
  );
}
