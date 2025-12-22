import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getTemplateById } from '@/data/goalTemplates/index';
import type { FormField, FormSection, CompoundField, ListField, GoalTemplate } from '@/types/goalTemplate';
import { Plus, Trash2, AlertCircle, Check, FileEdit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateMultipleTasks } from '@/components/calendar/services/taskGenerator';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

interface EditTemplateDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalId: string;
  goalData: any;
  onSuccess?: () => void;
}

export function EditTemplateDataModal({
  isOpen,
  onClose,
  goalId,
  goalData,
  onSuccess
}: EditTemplateDataModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);

  const templateId = goalData?.metadata?.template_id;
  const template = templateId ? getTemplateById(templateId) : null;
  const existingTemplateData = goalData?.metadata?.template_data || {};

  // Initialize form data from existing template data
  useEffect(() => {
    if (isOpen && existingTemplateData) {
      setFormData(existingTemplateData);
      setCurrentSection(0);
      setErrors({});
    }
  }, [isOpen, JSON.stringify(existingTemplateData)]);

  if (!template) {
    return null;
  }

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        return field.label + ' is required';
      }
      if (typeof value === 'string' && value.trim() === '') {
        return field.label + ' is required';
      }
      if (Array.isArray(value) && value.length === 0) {
        return field.label + ' is required';
      }
    }

    if (field.type === 'number' && value !== undefined && value !== '' && value !== null) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return field.label + ' must be a valid number';
      }
      const numField = field as { min?: number; max?: number };
      if (numField.min !== undefined && numValue < numField.min) {
        return field.label + ' must be at least ' + numField.min;
      }
      if (numField.max !== undefined && numValue > numField.max) {
        return field.label + ' must be at most ' + numField.max;
      }
    }

    if (field.type === 'list' && Array.isArray(value)) {
      const listField = field as ListField;
      if (listField.minItems !== undefined && value.length < listField.minItems) {
        return field.label + ' must have at least ' + listField.minItems + ' items';
      }
      if (listField.maxItems !== undefined && value.length > listField.maxItems) {
        return field.label + ' can have at most ' + listField.maxItems + ' items';
      }
    }

    return null;
  };

  const validateSection = (section: FormSection): boolean => {
    const sectionErrors: Record<string, string> = {};
    let hasError = false;

    section.fields.forEach(field => {
      const value = formData[field.id];
      const error = validateField(field, value);
      if (error) {
        sectionErrors[field.id] = error;
        hasError = true;
      }
    });

    setErrors(prev => ({ ...prev, ...sectionErrors }));
    return !hasError;
  };

  const validateAllSections = (): boolean => {
    let allValid = true;
    template.sections.forEach(section => {
      if (!validateSection(section)) {
        allValid = false;
      }
    });
    return allValid;
  };

  const updateFormData = (fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleSave = async (generateTasks: boolean = false) => {
    if (!validateAllSections()) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all required fields correctly',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const generatedPrompt = template.generatePrompt(formData);
      const generatedDescription = template.generateDescription(formData);

      // Update goal metadata with new template data
      const updatedMetadata = {
        ...goalData.metadata,
        template_data: formData,
        template_completed: true,
      };

      const { error: updateError } = await supabase
        .from('goals')
        .update({
          description: generatedDescription,
          metadata: updatedMetadata,
        })
        .eq('id', goalId);

      if (updateError) throw updateError;

      // Generate AI tasks if requested
      if (generateTasks) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) throw new Error('No authenticated user');

          const startDate = new Date();
          const targetDate = goalData.target_date ? new Date(goalData.target_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          const generatedTasks = await generateMultipleTasks(
            startDate,
            targetDate,
            goalId,
            goalData.title,
            generatedDescription,
            {
              goalType: updatedMetadata.goal_type,
              userContext: updatedMetadata.user_context
            }
          );

          if (generatedTasks.length > 0) {
            const tasksToInsert = generatedTasks.map((task: any) => ({
              id: task.id || uuidv4(),
              title: (task.description || task.title || '').length > 80 ? (task.description || task.title || '').substring(0, 80) + '...' : (task.description || task.title || ''),
              description: task.description || task.title || '',
              start_date: task.start_date || format(new Date(task.date || new Date()), 'yyyy-MM-dd') + 'T09:00:00',
              end_date: task.end_date || format(new Date(task.date || new Date()), 'yyyy-MM-dd') + 'T10:00:00',
              daily_start_time: task.daily_start_time || '09:00',
              daily_end_time: task.daily_end_time || '10:00',
              completed: false,
              goal_id: goalId,
              user_id: userData.user.id,
            }));

            const batchSize = 10;
            for (let i = 0; i < tasksToInsert.length; i += batchSize) {
              const batch = tasksToInsert.slice(i, i + batchSize);
              await supabase.from('tasks').insert(batch);
            }
          }

          toast({
            title: 'Template Updated! 🎉',
            description: `Template data saved and ${generatedTasks.length} tasks generated.`,
          });
        } catch (taskError) {
          console.error('Error generating tasks:', taskError);
          toast({
            title: 'Template Updated',
            description: 'Template data saved, but task generation failed.',
          });
        }
      } else {
        toast({
          title: 'Template Updated',
          description: 'Your template data has been saved.',
        });
      }

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating template data:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="text"
              placeholder={field.placeholder}
              value={(value as string) || ''}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            {field.helperText && !error && (
              <p className="text-xs text-muted-foreground italic">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'number': {
        const numField = field as { min?: number; max?: number; step?: number };
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              placeholder={field.placeholder}
              value={value !== undefined && value !== null && value !== '' ? String(value) : ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  updateFormData(field.id, '');
                } else {
                  const numValue = Number(inputValue);
                  if (!isNaN(numValue)) {
                    updateFormData(field.id, numValue);
                  }
                }
              }}
              min={numField.min}
              max={numField.max}
              step={numField.step}
              className={error ? 'border-destructive' : ''}
            />
            {field.helperText && !error && (
              <p className="text-xs text-muted-foreground italic">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      }

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={(value as string) || ''}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              className={error ? 'border-destructive' : ''}
              rows={4}
            />
            {field.helperText && !error && (
              <p className="text-xs text-muted-foreground italic">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'select': {
        const selectField = field as { options: { label: string; value: string }[] };
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <select
              id={field.id}
              value={(value as string) || ''}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              className={`w-full rounded-md border bg-background px-3 py-2 text-sm ${error ? 'border-destructive' : 'border-input'}`}
            >
              <option value="">Select...</option>
              {selectField.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {field.helperText && !error && (
              <p className="text-xs text-muted-foreground italic">{field.helperText}</p>
            )}
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      }

      case 'time':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="time"
              value={(value as string) || ''}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={(value as string) || ''}
              onChange={(e) => updateFormData(field.id, e.target.value)}
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );

      case 'list': {
        const listValue = (value as string[]) || [];
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            {listValue.map((item, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  placeholder={field.placeholder}
                  value={item || ''}
                  onChange={(e) => {
                    const newList = [...listValue];
                    newList[index] = e.target.value;
                    updateFormData(field.id, newList);
                  }}
                  className={error ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newList = listValue.filter((_, i) => i !== index);
                    updateFormData(field.id, newList);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateFormData(field.id, [...listValue, ''])}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      }

      case 'compound': {
        const compoundField = field as CompoundField;
        const compoundValue = (value as Record<string, string>[]) || [];
        return (
          <div key={field.id} className="space-y-4">
            <Label>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            {compoundValue.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-4">
                  {compoundField.fields.map(subField => (
                    <div key={subField.id} className="space-y-2">
                      <Label htmlFor={`${field.id}-${index}-${subField.id}`}>
                        {subField.label}
                      </Label>
                      <Input
                        id={`${field.id}-${index}-${subField.id}`}
                        type="text"
                        placeholder={subField.placeholder}
                        value={item[subField.id] || ''}
                        onChange={(e) => {
                          const newCompound = [...compoundValue];
                          newCompound[index] = {
                            ...newCompound[index],
                            [subField.id]: e.target.value,
                          };
                          updateFormData(field.id, newCompound);
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newCompound = compoundValue.filter((_, i) => i !== index);
                      updateFormData(field.id, newCompound);
                    }}
                    className="w-full"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem: Record<string, string> = {};
                compoundField.fields.forEach(f => {
                  newItem[f.id] = '';
                });
                updateFormData(field.id, [...compoundValue, newItem]);
              }}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add {field.label}
            </Button>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const section = template.sections[currentSection];
  const progress = ((currentSection + 1) / template.sections.length) * 100;
  const wasSkipped = !goalData?.metadata?.template_completed;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: template.color }}
            >
              {template.icon}
            </div>
            <div>
              <div className="text-lg font-semibold">Edit Template Data</div>
              <div className="text-sm text-muted-foreground font-normal">{template.name}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {wasSkipped && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <FileEdit className="w-4 h-4" />
              <span className="text-sm font-medium">Template data was skipped during creation. Fill it now to generate AI tasks.</span>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="flex items-center gap-3 mb-4">
          <div className="text-sm text-muted-foreground">
            Section {currentSection + 1} of {template.sections.length}
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Section navigation */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {template.sections.map((sec, idx) => (
            <button
              key={sec.id}
              onClick={() => setCurrentSection(idx)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                idx === currentSection
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {sec.icon && <span className="mr-1">{sec.icon}</span>}
              {sec.title}
            </button>
          ))}
        </div>

        {/* Current section */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            {section.icon && <span className="text-2xl">{section.icon}</span>}
            <div>
              <h3 className="font-semibold">{section.title}</h3>
              {section.description && (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {section.fields.map(field => renderField(field))}
          </div>
        </div>

        {/* Navigation and action buttons */}
        <div className="flex justify-between items-center gap-4 pt-4">
          <Button
            variant="outline"
            onClick={() => currentSection > 0 && setCurrentSection(currentSection - 1)}
            disabled={currentSection === 0}
          >
            Previous
          </Button>

          <div className="flex gap-2">
            {currentSection === template.sections.length - 1 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSave(false)}
                  disabled={isLoading}
                >
                  Save Only
                </Button>
                <Button
                  onClick={() => handleSave(true)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Save & Generate Tasks
                </Button>
              </>
            ) : (
              <Button onClick={() => setCurrentSection(currentSection + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}