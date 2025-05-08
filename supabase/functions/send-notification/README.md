
# Send Notification Edge Function

This edge function sends email notifications and in-app notifications for various events in the IRIS Protocol application.

## Configuration

Before using this function, make sure you have set up the required API keys:

1. Create an account at [Resend](https://resend.com)
2. Get your API key from the Resend dashboard
3. Add the API key to your Supabase project's secrets:
   - In the Supabase dashboard, go to Project Settings → Functions
   - Add `RESEND_API_KEY` as a secret with your API key from Resend

## Usage

The function accepts POST requests with a JSON body containing:

```json
{
  "type": "notificationType",
  "data": {
    "email": "user@example.com",
    "param1": "value1",
    "param2": "value2"
  }
}
```

Available notification types:
- `welcome`: Sends a welcome email to new users
- `insurancePurchase`: Sends insurance purchase confirmation
- `insuranceUpgrade`: Sends insurance upgrade confirmation
- `insuranceCancel`: Sends insurance cancellation notification
- `claimSubmitted`: Sends claim submission confirmation
- `claimUpdate`: Sends claim status update
- `protectionDisabled`: Sends alert when protection is disabled

## Local Development

To run the function locally:

1. Make sure you have the Supabase CLI installed
2. Set up your environment variables in a `.env` file
3. Run `supabase start` to start the local development server
4. Run `supabase functions serve send-notification` to start the function
