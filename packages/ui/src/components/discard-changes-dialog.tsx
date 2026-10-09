import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"

type DiscardChangesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when the user chooses to throw the edits away. */
  onDiscard: () => void
  title: string
  description: string
  keepLabel: string
  discardLabel: string
}

/** Confirms leaving a dirty form; labels are supplied by the caller (i18n). */
export function DiscardChangesDialog({
  open,
  onOpenChange,
  onDiscard,
  title,
  description,
  keepLabel,
  discardLabel,
}: DiscardChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{keepLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>{discardLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
