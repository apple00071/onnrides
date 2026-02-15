"use client"

import * as React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

interface DrawerDialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    trigger?: React.ReactNode
    title?: React.ReactNode
    description?: React.ReactNode
    children?: React.ReactNode
    footer?: React.ReactNode
    className?: string
}

export function DrawerDialog({
    open,
    onOpenChange,
    trigger,
    title,
    description,
    children,
    footer,
    className,
}: DrawerDialogProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)")

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
                <DialogContent className={cn("sm:max-w-[425px]", className)}>
                    <DialogHeader>
                        {title && <DialogTitle>{title}</DialogTitle>}
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {children}
                    </div>
                    {footer}
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
            <DrawerContent className={cn("h-[85vh]", className)}>
                <DrawerHeader className="text-left">
                    {title && <DrawerTitle>{title}</DrawerTitle>}
                    {description && <DrawerDescription>{description}</DrawerDescription>}
                </DrawerHeader>
                <div className="px-4 overflow-y-auto">
                    {children}
                </div>
                <DrawerFooter className="pt-2">
                    {footer}
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
