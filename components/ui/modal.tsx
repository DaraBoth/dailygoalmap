
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";

export const Modal = ({ isOpen, onClose, children, className }: { 
  isOpen: boolean; 
  onClose: () => void; 
  children: React.ReactNode;
  className?: string;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className={`max-w-md mx-auto ${className || ''}`}>{children}</DialogContent>
  </Dialog>
);

export const ModalHeader = ({ children }: { children: React.ReactNode }) => (
  <DialogHeader className="text-xl font-semibold">{children}</DialogHeader>
);

export const ModalBody = ({ children }: { children: React.ReactNode }) => (
  <div className="py-4">{children}</div>
);

export const ModalFooter = ({ children }: { children: React.ReactNode }) => (
  <DialogFooter className="flex justify-end gap-2">{children}</DialogFooter>
);
