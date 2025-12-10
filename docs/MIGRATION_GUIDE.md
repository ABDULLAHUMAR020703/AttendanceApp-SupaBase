# Migration Guide: Legacy to Modular Architecture

## Overview

This guide helps migrate from the legacy flat structure to the new modular architecture.

## Migration Status

### ✅ Completed
- Core modules (config, contexts, navigation)
- Shared constants and utilities
- Auth feature module
- Navigation refactoring

### 🔄 In Progress
- Feature modules (attendance, tickets, leave, employees, etc.)
- Screen imports updates

### ⏳ Pending
- Complete feature migration
- Remove legacy code
- Update all imports

## Migration Steps

### Step 1: Update Imports

#### Old Import
```javascript
import { authenticateUser } from '../utils/auth';
```

#### New Import
```javascript
import { authenticateUser } from '../features/auth';
// or
import { authenticateUser } from '../features/auth/services/authService';
```

### Step 2: Update Context Imports

#### Old Import
```javascript
import { useAuth } from '../contexts/AuthContext';
```

#### New Import
```javascript
import { useAuth } from '../core/contexts/AuthContext';
```

### Step 3: Update Constants

#### Old Import
```javascript
import { WORK_MODES } from '../utils/workModes';
```

#### New Import
```javascript
import { WORK_MODES } from '../shared/constants/workModes';
```

### Step 4: Update Component Imports

#### Old Import
```javascript
import Logo from '../components/Logo';
```

#### New Import
```javascript
import Logo from '../shared/components/Logo';
```

## Feature Migration Checklist

For each feature (attendance, tickets, leave, etc.):

- [ ] Create feature directory structure
- [ ] Move screens to `features/[feature]/screens/`
- [ ] Move services to `features/[feature]/services/`
- [ ] Move utils to `features/[feature]/utils/`
- [ ] Create `features/[feature]/index.js` for exports
- [ ] Update all imports
- [ ] Test feature functionality
- [ ] Remove legacy code

## Backward Compatibility

During migration, both old and new paths are maintained:

- Legacy: `utils/auth.js` → Still works
- New: `features/auth/services/authService.js` → Preferred

## Testing After Migration

1. Test authentication flow
2. Test navigation
3. Test each feature module
4. Verify no broken imports
5. Check console for warnings

## Rollback Plan

If issues occur:

1. Revert to previous commit
2. Fix issues in legacy structure
3. Re-attempt migration incrementally

## Questions?

Refer to `MODULAR_ARCHITECTURE.md` for detailed architecture documentation.

