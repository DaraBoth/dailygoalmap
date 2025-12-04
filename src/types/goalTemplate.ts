// Goal Template Type Definitions

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'textarea' 
  | 'select' 
  | 'time'
  | 'date'
  | 'list' // For dynamic lists (goals, supplements, etc.)
  | 'compound'; // For grouped fields (supplements with name + timing)

export interface FieldOption {
  label: string;
  value: string;
}

export interface BaseField {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helperText?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | string[] | Record<string, unknown>;
}

export interface TextField extends BaseField {
  type: 'text';
}

export interface NumberField extends BaseField {
  type: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface TextareaField extends BaseField {
  type: 'textarea';
  minHeight?: number;
}

export interface SelectField extends BaseField {
  type: 'select';
  options: FieldOption[];
}

export interface TimeField extends BaseField {
  type: 'time';
}

export interface DateField extends BaseField {
  type: 'date';
}

export interface ListField extends BaseField {
  type: 'list';
  itemPlaceholder?: string;
  minItems?: number;
  maxItems?: number;
}

export interface CompoundField extends BaseField {
  type: 'compound';
  fields: FormField[];
  minItems?: number;
  maxItems?: number;
}

export type FormField = 
  | TextField 
  | NumberField 
  | TextareaField 
  | SelectField 
  | TimeField
  | DateField
  | ListField 
  | CompoundField;

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: FormField[];
}

export interface GoalTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string; // Gradient or solid color
  category: 'health' | 'finance' | 'education' | 'career' | 'personal' | 'other';
  sections: FormSection[];
  generatePrompt: (data: Record<string, unknown>) => string; // Function to generate the AI prompt
  generateDescription: (data: Record<string, unknown>) => string; // Function to generate goal description
}

export interface TemplateFormData {
  templateId: string;
  formData: Record<string, unknown>;
  generatedPrompt: string;
  generatedDescription: string;
}
