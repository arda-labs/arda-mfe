import { toast } from "./toast"

function messageWithDescription(message: string, description?: string) {
  return description ? `${message}\n${description}` : message
}

export const notify = {
  success: (message: string, description?: string) => {
    toast.success(messageWithDescription(message, description))
  },
  error: (message: string, description?: string) => {
    toast.error(messageWithDescription(message, description), {
      autoClose: 5000,
    })
  },
  info: (message: string, description?: string) => {
    toast.info(messageWithDescription(message, description))
  },
  warning: (message: string, description?: string) => {
    toast.warning(messageWithDescription(message, description), {
      autoClose: 4000,
    })
  },
  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return toast.promise(promise, {
      pending: messages.loading,
      success: messages.success,
      error: {
        render: ({ data }) =>
          `${messages.error}: ${data instanceof Error ? data.message : String(data)}`,
      },
    })
  },
  dismiss: () => toast.dismiss(),
}
