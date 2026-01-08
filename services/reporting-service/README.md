# Reporting Service

Microservice for generating and emailing attendance, leave, and ticket reports.

## Setup

1. **Install Dependencies**
   ```bash
   cd services/reporting-service
   npm install
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file in `services/reporting-service/`:
   ```env
   PORT=3002
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Email Configuration (for sending reports via Resend)
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   # Optional: Report recipient email (overrides database lookup)
   REPORT_RECIPIENT_EMAIL=admin@yourdomain.com
   ```

3. **Start the Service**
   ```bash
   npm start
   # or
   npm run dev
   ```

The service will start on port 3002 (or the port specified in the `PORT` environment variable).

## Features

- **Automatic Monthly Reports**: Generates and emails monthly reports on the 1st of every month at 2:00 AM UTC
- **Manual Report Generation**: API endpoint for on-demand report generation
- **Multiple Report Types**: Weekly, Monthly, Yearly, All-time, and Custom date ranges
- **PDF Generation**: Professional PDF reports with company-wide and department-wise statistics
- **Email Delivery**: Sends reports via email to Super Admin

## Endpoints

- `POST /api/reports/generate` - Generate a report manually
- `GET /api/reports/health` - Health check
- `GET /health` - Service health check
- `GET /` - Service information

## Report Generation

### Manual Report Generation

**Endpoint:** `POST /api/reports/generate`

**Headers:**
- `x-user-id`: User ID (for authentication)
- `x-user-email`: User email (alternative authentication)

**Request Body:**
```json
{
  "range": "weekly | monthly | yearly | all | custom",
  "from": "2026-01-01",  // Optional, required for custom
  "to": "2026-01-31"      // Optional, required for custom
}
```

**Response:**
```json
{
  "success": true,
  "message": "Report generation started. You will receive the report via email shortly.",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

**Note:** Report generation happens asynchronously. The API returns immediately, and the report is sent via email when ready.

## Security

- Only Super Admins can generate reports
- Uses Supabase Service Role Key for read-only database access
- Service Role Key never exposed to frontend
- All database queries are read-only

## Monthly Report Job

The service automatically generates and emails monthly reports on the 1st of every month at 2:00 AM UTC. The report covers the previous month's data.

## Email Configuration

The service uses [Resend](https://resend.com) for reliable email delivery via HTTPS API (no SMTP required).

### Setup Steps:

1. **Create a Resend account** at https://resend.com
2. **Get your API key** from the Resend dashboard
3. **Verify your domain** in Resend (required for sending emails)
4. **Set environment variables:**
   - `RESEND_API_KEY`: Your Resend API key (starts with `re_`)
   - `RESEND_FROM_EMAIL`: Verified sender email (e.g., `noreply@yourdomain.com`)

### Why Resend?

- ✅ No SMTP connection timeouts (uses HTTPS API)
- ✅ Reliable delivery on cloud platforms like Render
- ✅ Better deliverability and tracking
- ✅ Simple API-based integration

## Troubleshooting

### Email Not Sending

1. Verify `RESEND_API_KEY` is set correctly in environment variables
2. Ensure your domain is verified in Resend dashboard
3. Check that `RESEND_FROM_EMAIL` uses a verified domain
4. Review service logs for detailed error messages
5. Check Resend dashboard for delivery status and errors

### Report Generation Fails

1. Verify Supabase credentials are correct
2. Check database connection
3. Ensure Service Role Key has read access to all tables
4. Review service logs for detailed error messages

