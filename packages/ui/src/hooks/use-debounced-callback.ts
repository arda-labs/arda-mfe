import * as React from "react";

function useCallbackRef<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  });
  return React.useMemo(() => ((...args: Parameters<T>) => callbackRef.current(...args)) as T, []);
}

export type DebouncedCallback<T extends (...args: never[]) => unknown> = ((
  ...args: Parameters<T>
) => void) & {
  cancel: () => void;
};

export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
): DebouncedCallback<T> {
  const handleCallback = useCallbackRef(callback);
  const debounceTimerRef = React.useRef(0);
  React.useEffect(
    () => () => window.clearTimeout(debounceTimerRef.current),
    [],
  );

  const cancel = React.useCallback(() => {
    window.clearTimeout(debounceTimerRef.current);
  }, []);

  const setValue = React.useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(
        () => handleCallback(...args),
        delay,
      );
    },
    [handleCallback, delay],
  ) as DebouncedCallback<T>;

  setValue.cancel = cancel;

  return setValue;
}
