import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Input } from './input';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

interface DatePickerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: string;
  onChange?: (e: any) => void;
  className?: string;
}

export function DatePickerInput({ value, onChange, className, id, name, ...props }: DatePickerInputProps) {
  const dateValue = value ? (isValid(parseISO(value)) ? parseISO(value) : null) : null;

  return (
    <div className="relative w-full">
      <DatePicker
        selected={dateValue}
        onChange={(date: Date | null) => {
          const val = date ? format(date, 'yyyy-MM-dd') : '';
          // Create a synthetic event
          if (onChange) {
            onChange({ target: { name, id, value: val } });
          }
        }}
        dateFormat="dd/MM/yyyy"
        className={`w-full ${className || ''}`}
        customInput={<Input {...props} id={id} name={name} />}
      />
      <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      {/* 
        To make it work well on Smart TVs with remote control, 
        we overlay an absolute positioning so the icon is visible 
        but we don't interfere with the focus.
      */}
      <style dangerouslySetInnerHTML={{__html: `
        .react-datepicker-wrapper {
          width: 100%;
        }
        .react-datepicker__input-container {
          width: 100%;
        }
        .react-datepicker-popper {
          z-index: 9999 !important;
        }
      `}} />
    </div>
  );
}
