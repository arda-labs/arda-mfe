import type { ComponentProps } from "react"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

type ToasterProps = ComponentProps<typeof ToastContainer>

function Toaster({ ...props }: ToasterProps) {
  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      closeOnClick
      draggable
      newestOnTop
      pauseOnFocusLoss
      pauseOnHover
      theme="colored"
      className="!z-[200]"
      toastClassName="!z-[200]"
      {...props}
    />
  )
}

export { Toaster }
