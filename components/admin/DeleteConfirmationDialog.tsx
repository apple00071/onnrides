'use client';

import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    confirmationText?: string;
}

export function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you absolutely sure?",
    description = "This action cannot be undone. This will permanently delete the item and remove the data from our servers.",
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
    isDestructive = true,
    confirmationText,
}: DeleteConfirmationDialogProps) {
    const [inputValue, setInputValue] = React.useState('');

    // Reset input when dialog closes
    React.useEffect(() => {
        if (!isOpen) {
            setInputValue('');
        }
    }, [isOpen]);

    const isConfirmDisabled = confirmationText ? inputValue !== confirmationText : false;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>

                    {confirmationText && (
                        <div className="mt-4 space-y-3">
                            <Label
                                htmlFor="confirmation-text"
                                className="text-sm font-semibold text-destructive"
                            >
                                Type "{confirmationText}" to confirm:
                            </Label>
                            <Input
                                id="confirmation-text"
                                value={inputValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                                placeholder={confirmationText}
                                className="border-destructive/30 focus-visible:ring-destructive"
                                autoComplete="off"
                            />
                        </div>
                    )}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>{cancelLabel}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            if (isConfirmDisabled) {
                                e.preventDefault();
                                return;
                            }
                            onConfirm();
                            onClose();
                        }}
                        disabled={isConfirmDisabled}
                        className={isDestructive ? buttonVariants({ variant: "destructive" }) : ""}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
