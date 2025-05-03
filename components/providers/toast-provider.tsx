"use client"

import * as React from "react"
import { type ToastState } from "@/components/ui/toast"

interface State {
  toasts: ToastState[]
}

type ActionType = {
  type: "ADD_TOAST"
  toast: ToastState
} | {
  type: "UPDATE_TOAST"
  toast: Partial<ToastState>
  id: string
} | {
  type: "DISMISS_TOAST"
  id: string
} | {
  type: "REMOVE_TOAST"
  id: string
}

const toastReducer = (state: State, action: ActionType): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, open: false } : t
        ),
      }

    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      }

    default:
      return state
  }
}

const initialState: State = {
  toasts: [],
}

export const ToastContext = React.createContext<{
  state: State
  dispatch: React.Dispatch<ActionType>
}>({
  state: initialState,
  dispatch: () => null,
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, initialState)

  return (
    <ToastContext.Provider value={{ state, dispatch }}>
      {children}
    </ToastContext.Provider>
  )
} 