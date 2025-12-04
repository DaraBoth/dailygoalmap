import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getTemplateById } from '@/data/goalTemplates/index';
import type { FormField, FormSection, CompoundField, ListField } from '@/types/goalTemplate';
import { Plus, Trash2, ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useCreateGoal } from '@/hooks/useCreateGoal';

export function TemplateFormPage() {
  const { templateId } = useParams({ from: '/goal/create-from-template/$templateId' });
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createGoal, isLoading: isCreating } = useCreateGoal();
  
  const template = getTemplateById(templateId);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentSection, setCurrentSection] = useState(0);

  if (!template) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Template Not Found</CardTitle>
            <CardDescription>The requested template could not be found.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate({ to: '/goal/create' })}>
              Back to Templates
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateField = (field: FormField, value: unknown): string | null => {
    if (field.required && (value === undefined || value === null || value === '')) {
      return field.label + ' is required';
    }

    if (field.type === 'number' && value !== undefined && value !== '') {
      const numValue = Number(value);
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

    if (field.type === 'compound' && Array.isArray(value)) {
      const compoundField = field as CompoundField;
      if (compoundField.minItems !== undefined && value.length < compoundField.minItems) {
        return field.label + ' must have at least ' + compoundField.minItems + ' items';
      }
      if (compoundField.maxItems !== undefined && value.length > compoundField.maxItems) {
        return field.label + ' can have at most ' + compoundField.maxItems + ' items';
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

  const handleNext = () => {
    if (validateSection(template.sections[currentSection])) {
      if (currentSection < template.sections.length - 1) {
        setCurrentSection(currentSection + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly',
        variant: 'destructive',
      });
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    // Validate all sections
    let allValid = true;
    template.sections.forEach(section => {
      if (!validateSection(section)) {
        allValid = false;
      }
    });

    if (!allValid) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all sections correctly',
        variant: 'destructive',
      });
      return;
    }

    try {
      const generatedPrompt = template.generatePrompt(formData);
      const generatedDescription = template.generateDescription(formData);

      await createGoal({
        title: template.name,
        description: generatedDescription,
        target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        metadata: {
          version: 1,
          goal_type: 'general',
          template_id: template.id,
          template_name: template.name,
          template_data: formData,
          ai_prompt: generatedPrompt,
        },
      });

      toast({
        title: 'Goal Created!',
        description: 'Your goal has been created successfully',
      });

      navigate({ to: '/dashboard' });
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to create goal. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const updateFormData = (fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // Clear error for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
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
              value={(value as number) ?? ''}
              onChange={(e) => updateFormData(field.id, e.target.value ? Number(e.target.value) : '')}
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

      case 'time':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="time"
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
                  value={item}
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
                  size="icon"
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
              Add {field.label}
            </Button>
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

      default:
        return null;
    }
  };

  const section = template.sections[currentSection];
  const progress = ((currentSection + 1) / template.sections.length) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: '/goal/create' })}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Templates
        </Button>
        <div 
          className="w-20 h-20 rounded-2xl mb-4 flex items-center justify-center text-5xl shadow-lg"
          style={{ background: template.color }}
        >
          {template.icon}
        </div>
        <h1 className="text-4xl font-bold mb-2">{template.name}</h1>
        <p className="text-muted-foreground text-lg">{template.description}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">
            Section {currentSection + 1} of {template.sections.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}% Complete
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Section */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            {section.icon && <span className="text-3xl">{section.icon}</span>}
            <CardTitle className="text-2xl">{section.title}</CardTitle>
          </div>
          {section.description && (
            <CardDescription>{section.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {section.fields.map(field => renderField(field))}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentSection === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentSection === template.sections.length - 1 ? (
          <Button
            onClick={handleSubmit}
            disabled={isCreating}
            className="min-w-32"
          >
            {isCreating ? (
              'Creating...'
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Create Goal
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Button>
        )}
      </div>

      {/* Section Navigation (Mini Map) */}
      <div className="mt-8 flex gap-2 justify-center flex-wrap">
        {template.sections.map((sec, idx) => (
          <button
            key={sec.id}
            onClick={() => setCurrentSection(idx)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              idx === currentSection
                ? 'bg-primary text-primary-foreground'
                : idx < currentSection
                ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {idx < currentSection && <Check className="w-3 h-3 inline mr-1" />}
            {sec.title}
          </button>
        ))}
      </div>
    </div>
  );
}
