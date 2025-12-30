import axios from "axios";

class TwilioAPI {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN || "";
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || "";
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  private getAuth() {
    return {
      username: this.accountSid,
      password: this.authToken,
    };
  }

  // Send SMS
  async sendSMS(params: { to: string; body: string }) {
    const response = await axios.post(
      `${this.baseUrl}/Messages.json`,
      new URLSearchParams({
        To: params.to,
        From: this.phoneNumber,
        Body: params.body,
      }),
      {
        auth: this.getAuth(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  }

  // Make Voice Call
  async makeCall(params: { to: string; twiml: string }) {
    const response = await axios.post(
      `${this.baseUrl}/Calls.json`,
      new URLSearchParams({
        To: params.to,
        From: this.phoneNumber,
        Twiml: params.twiml,
      }),
      {
        auth: this.getAuth(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return response.data;
  }

  // Send Booking Confirmation SMS
  async sendBookingConfirmation(params: {
    to: string;
    bookingReference: string;
    bookingType: "flight" | "hotel";
    details: string;
  }) {
    const body = `✈️ Booking Confirmed!\n\nReference: ${params.bookingReference}\nType: ${params.bookingType.toUpperCase()}\n${params.details}\n\nThank you for booking with TravelHub!`;

    return this.sendSMS({ to: params.to, body });
  }

  // Send Booking Reminder SMS
  async sendBookingReminder(params: {
    to: string;
    bookingReference: string;
    reminderDetails: string;
  }) {
    const body = `⏰ Reminder!\n\nYour booking ${params.bookingReference} is coming up.\n${params.reminderDetails}\n\nHave a great trip!`;

    return this.sendSMS({ to: params.to, body });
  }

  // Get Message Status
  async getMessageStatus(messageSid: string) {
    const response = await axios.get(
      `${this.baseUrl}/Messages/${messageSid}.json`,
      { auth: this.getAuth() }
    );

    return response.data;
  }
}

export const twilioAPI = new TwilioAPI();

