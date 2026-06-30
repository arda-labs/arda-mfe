import { toast } from "sonner"

export const notify = {
  success: (message: string, description?: string) => {
    toast.success(message, { description })
  },
  error: (message: string, description?: string) => {
    toast.error(message, { description, duration: 5000 })
  },
  info: (message: string, description?: string) => {
    toast.info(message, { description })
  },
  warning: (message: string, description?: string) => {
    toast.warning(message, { description, duration: 4000 })
  },
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err: unknown) =>
        `${messages.error}: ${err instanceof Error ? err.message : String(err)}`,
    })
  },
  dismiss: () => toast.dismiss(),
}
