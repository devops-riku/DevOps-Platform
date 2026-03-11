'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { Search, Check, ChevronDown, Loader2 } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export interface ComboboxProps {
    options: { label: string; value: string }[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    className?: string
    disabled?: boolean
    loading?: boolean
}

export function Combobox({
    options,
    value,
    onValueChange,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    className,
    disabled = false,
    loading = false
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false)

    const selectedOption = options.find((opt) => opt.value === value)

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
                <button
                    disabled={disabled || loading}
                    className={cn(
                        "flex h-12 w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-6 py-4 text-sm text-white outline-none transition-all focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                >
                    <span className="truncate">
                        {loading ? (
                            <span className="flex items-center gap-2 text-slate-500">
                                <Loader2 className="w-3 h-3 animate-spin" /> Fetching...
                            </span>
                        ) : selectedOption ? (
                            selectedOption.label
                        ) : (
                            <span className="text-slate-600">{placeholder}</span>
                        )}
                    </span>
                    <ChevronDown className="h-4 w-4 text-slate-700 shrink-0 ml-2" />
                </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    align="start"
                    collisionPadding={10}
                    className="z-[100] w-[var(--radix-popover-trigger-width)] max-h-[var(--radix-popover-content-available-height)] overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0c]/95 backdrop-blur-2xl text-slate-300 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                    sideOffset={6}
                >
                    <CommandPrimitive className="flex flex-col overflow-hidden">
                        <div className="flex items-center border-b border-white/5 px-4" cmdk-input-wrapper="">
                            <Search className="mr-3 h-3.5 w-3.5 shrink-0 opacity-40" />
                            <CommandPrimitive.Input
                                placeholder={searchPlaceholder}
                                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 font-bold"
                            />
                        </div>
                        <CommandPrimitive.List className="max-h-[280px] overflow-y-auto select-scrollbar p-1">
                            <CommandPrimitive.Empty className="py-6 text-center text-xs font-black uppercase tracking-widest text-slate-700">
                                {emptyMessage}
                            </CommandPrimitive.Empty>
                            <CommandPrimitive.Group>
                                {options.map((option) => (
                                    <CommandPrimitive.Item
                                        key={option.value}
                                        value={option.value}
                                        onSelect={(val) => {
                                            onValueChange(val)
                                            setOpen(false)
                                        }}
                                        className={cn(
                                            "relative flex cursor-default select-none items-center rounded-lg px-4 py-3 text-sm outline-none transition-colors data-[selected=true]:bg-white/5 data-[selected=true]:text-white font-bold",
                                            value === option.value && "bg-white/5 text-white"
                                        )}
                                    >
                                        <span className="flex-grow">{option.label}</span>
                                        {value === option.value && (
                                            <Check className="ml-2 h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </CommandPrimitive.Item>
                                ))}
                            </CommandPrimitive.Group>
                        </CommandPrimitive.List>
                    </CommandPrimitive>
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    )
}
