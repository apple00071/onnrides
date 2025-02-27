export const MESSAGE_TEMPLATES = {
  booking_confirmation: {
    name: "booking_confirmation",
    language: {
      code: "en"
    },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{booking_id}}" },
          { type: "text", text: "{{vehicle_name}}" },
          { type: "text", text: "{{start_date}}" },
          { type: "text", text: "{{end_date}}" },
          { type: "text", text: "{{total_amount}}" }
        ]
      }
    ]
  },
  payment_confirmation: {
    name: "payment_confirmation",
    language: {
      code: "en"
    },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{booking_id}}" },
          { type: "text", text: "{{amount}}" },
          { type: "text", text: "{{payment_id}}" }
        ]
      }
    ]
  },
  booking_cancellation: {
    name: "booking_cancellation",
    language: {
      code: "en"
    },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{booking_id}}" },
          { type: "text", text: "{{vehicle_name}}" },
          { type: "text", text: "{{cancellation_reason}}" }
        ]
      }
    ]
  },
  general_notification: {
    name: "general_notification",
    language: {
      code: "en"
    },
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "{{message}}" }
        ]
      }
    ]
  }
} as const;

export type MessageTemplate = keyof typeof MESSAGE_TEMPLATES; 