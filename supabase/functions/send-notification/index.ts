
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@1.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const resend = new Resend(RESEND_API_KEY);

interface NotificationRequest {
  email: string;
  type: string;
  data: Record<string, string>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { email, type, data }: NotificationRequest = await req.json();
    
    if (!email || !type) {
      return new Response(JSON.stringify({ error: "Email and type are required" }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Generate email template based on notification type
    let subject = "IRIS Protocol Notification";
    let html = generateBasicEmail("Notification", "You have a new notification from IRIS Protocol.");
    
    switch (type) {
      case "insurancePurchase":
        subject = "Insurance Purchase Confirmation";
        html = generateInsuranceEmail(
          "Insurance Purchased Successfully",
          `Your ${data.tier} insurance policy has been purchased and is now active.`,
          data.tier,
          data.coverage,
          data.expiry
        );
        break;
      case "insuranceRenew":
        subject = "Insurance Renewed Successfully";
        html = generateInsuranceEmail(
          "Insurance Renewed Successfully",
          `Your ${data.tier} insurance policy has been renewed and is now active.`,
          data.tier,
          data.coverage,
          data.expiry
        );
        break;
      case "insuranceUpgrade":
        subject = "Insurance Upgraded Successfully";
        html = generateInsuranceEmail(
          "Insurance Upgraded Successfully",
          `Your insurance policy has been upgraded from ${data.oldTier} to ${data.newTier}.`,
          data.newTier,
          data.coverage,
          data.expiry || "30 days from today"
        );
        break;
      case "insuranceDowngrade":
        subject = "Insurance Plan Changed";
        html = generateInsuranceEmail(
          "Insurance Plan Changed",
          `Your insurance policy has been changed from ${data.oldTier} to ${data.newTier}.`,
          data.newTier,
          data.coverage,
          data.expiry || "30 days from today"
        );
        break;
      case "insuranceCancel":
        subject = "Insurance Cancellation Confirmation";
        html = generateBasicEmail(
          "Insurance Cancelled",
          `Your ${data.tier} insurance policy has been cancelled successfully. We hope to see you back soon!`
        );
        break;
      case "claimSubmitted":
        subject = "Claim Submitted Successfully";
        html = generateClaimEmail(
          "Claim Submitted Successfully",
          `Your claim #${data.claimId} for ${data.amount} has been submitted successfully and is now being processed.`
        );
        break;
      case "claimApproved":
        subject = "Claim Approved";
        html = generateClaimEmail(
          "Claim Approved",
          `Great news! Your claim #${data.claimId} for ${data.amount} has been approved.`
        );
        break;
      case "claimRejected":
        subject = "Claim Update";
        html = generateClaimEmail(
          "Claim Update",
          `Your claim #${data.claimId} for ${data.amount} could not be approved at this time.`
        );
        break;
      case "protectionEnabled":
        subject = "Protection Enabled";
        html = generateBasicEmail(
          "Protection Enabled",
          `Protection has been enabled for your account. Your assets are now being monitored for risks.`
        );
        break;
      case "protectionDisabled":
        subject = "Protection Disabled";
        html = generateBasicEmail(
          "Protection Disabled",
          `Protection has been disabled for your account. Your assets are no longer being monitored for risks.`
        );
        break;
      default:
        html = generateBasicEmail(
          "Notification",
          "You have a new notification from IRIS Protocol."
        );
    }
    
    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: 'IRIS Protocol <notifications@irisprotocol.com>',
      to: [email],
      subject: subject,
      html: html,
    });
    
    if (error) {
      console.error("Email sending failed:", error);
      throw error;
    }
    
    console.log(`Email sent: ${type}`, { data: emailData, error: null });
    
    return new Response(JSON.stringify({ data: emailData, error: null }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error in send-notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// Generate a professional-looking basic email
function generateBasicEmail(title: string, message: string): string {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f9f9f9;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #7d4bff 0%, #6527be 100%);
          padding: 30px; 
          color: white; 
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .content { 
          padding: 30px; 
          line-height: 1.5;
        }
        .footer { 
          background-color: #f2f2f2; 
          padding: 20px; 
          text-align: center; 
          color: #666;
          font-size: 12px;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #7d4bff 0%, #6527be 100%);
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 20px;
          font-weight: 500;
        }
        h1 { margin-top: 0; color: #333; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">IRIS Protocol</div>
          <div>Insurance & Risk Intelligence System</div>
        </div>
        <div class="content">
          <h1>${title}</h1>
          <p>${message}</p>
          <a href="https://irisprotocol.io/dashboard" class="btn">View Dashboard</a>
        </div>
        <div class="footer">
          <p>© 2025 IRIS Protocol. All rights reserved.</p>
          <p>If you didn't request this email, please ignore it.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

// Generate a specialized insurance email
function generateInsuranceEmail(title: string, message: string, tier: string, coverage: string, expiry: string): string {
  // Choose color scheme based on insurance tier
  let gradientColors = "linear-gradient(135deg, #7d4bff 0%, #6527be 100%)";
  if (tier === "Basic") {
    gradientColors = "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)";
  } else if (tier === "Premium") {
    gradientColors = "linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)";
  }

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f9f9f9;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: ${gradientColors};
          padding: 30px; 
          color: white; 
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .content { 
          padding: 30px; 
          line-height: 1.5;
        }
        .insurance-card {
          background: ${gradientColors};
          color: white;
          border-radius: 12px;
          padding: 20px;
          margin: 20px 0;
          position: relative;
          overflow: hidden;
        }
        .insurance-card h2 {
          margin-top: 0;
          font-size: 18px;
          font-weight: 700;
        }
        .insurance-card .shield {
          position: absolute;
          right: 20px;
          top: 20px;
          font-size: 24px;
        }
        .insurance-details {
          margin-top: 20px;
          display: flex;
          justify-content: space-between;
        }
        .insurance-detail-item {
          text-align: center;
        }
        .detail-label {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 4px;
        }
        .detail-value {
          font-weight: 700;
        }
        .footer { 
          background-color: #f2f2f2; 
          padding: 20px; 
          text-align: center; 
          color: #666;
          font-size: 12px;
        }
        .btn {
          display: inline-block;
          background: ${gradientColors};
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 20px;
          font-weight: 500;
        }
        h1 { margin-top: 0; color: #333; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">IRIS Protocol</div>
          <div>Insurance & Risk Intelligence System</div>
        </div>
        <div class="content">
          <h1>${title}</h1>
          <p>${message}</p>
          
          <div class="insurance-card">
            <div class="shield">🛡️</div>
            <h2>${tier} Insurance</h2>
            <p>Protection from exploits & failures</p>
            
            <div class="insurance-details">
              <div class="insurance-detail-item">
                <div class="detail-label">Coverage</div>
                <div class="detail-value">${coverage}</div>
              </div>
              <div class="insurance-detail-item">
                <div class="detail-label">Expires</div>
                <div class="detail-value">${expiry}</div>
              </div>
            </div>
          </div>
          
          <a href="https://irisprotocol.io/insurance" class="btn">View Insurance</a>
        </div>
        <div class="footer">
          <p>© 2025 IRIS Protocol. All rights reserved.</p>
          <p>If you didn't request this email, please ignore it.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

// Generate a specialized claim email
function generateClaimEmail(title: string, message: string): string {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f9f9f9;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #7d4bff 0%, #6527be 100%);
          padding: 30px; 
          color: white; 
          text-align: center;
        }
        .logo { 
          font-size: 24px; 
          font-weight: bold; 
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .content { 
          padding: 30px; 
          line-height: 1.5;
        }
        .claim-status {
          background-color: #f0f7ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .claim-status h2 {
          margin-top: 0;
          color: #3b82f6;
          font-size: 16px;
          font-weight: 600;
        }
        .footer { 
          background-color: #f2f2f2; 
          padding: 20px; 
          text-align: center; 
          color: #666;
          font-size: 12px;
        }
        .btn {
          display: inline-block;
          background: linear-gradient(135deg, #7d4bff 0%, #6527be 100%);
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 4px;
          margin-top: 20px;
          font-weight: 500;
        }
        h1 { margin-top: 0; color: #333; font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">IRIS Protocol</div>
          <div>Insurance & Risk Intelligence System</div>
        </div>
        <div class="content">
          <h1>${title}</h1>
          <p>${message}</p>
          
          <div class="claim-status">
            <h2>Claim Status</h2>
            <p>We'll keep you updated on the progress of your claim via email and in your dashboard.</p>
          </div>
          
          <a href="https://irisprotocol.io/claims" class="btn">View Claim Details</a>
        </div>
        <div class="footer">
          <p>© 2025 IRIS Protocol. All rights reserved.</p>
          <p>If you didn't request this email, please ignore it.</p>
        </div>
      </div>
    </body>
  </html>
  `;
}

serve(handler);
