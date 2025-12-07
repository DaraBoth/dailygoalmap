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
    // For required fields, check if value is truly empty
    if (field.required) {
      if (value === undefined || value === null || value === '') {
        return field.label + ' is required';
      }
      
      // Check for empty string with whitespace for text fields
      if (typeof value === 'string' && value.trim() === '') {
        return field.label + ' is required';
      }
      
      // Check for empty arrays
      if (Array.isArray(value) && value.length === 0) {
        return field.label + ' is required';
      }
    }

    // Additional number validation (min/max)
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
      
      // Debug log to see what's failing
      if (error) {
        console.log(`Validation error for field "${field.id}":`, {
          label: field.label,
          required: field.required,
          value,
          error
        });
      }
      
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

      // Automatically enable AI task generation for template-based goals
      const result = await createGoal(
        {
          title: template.name,
          description: generatedDescription,
          target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          start_date: new Date(), // Start today
          metadata: {
            version: 1,
            goal_type: 'general',
            template_id: template.id,
            template_name: template.name,
            template_data: formData,
          },
        },
        {
          generateTasksWithAI: true, // Always generate AI tasks for templates
          aiPrompt: generatedPrompt, // Use the generated prompt from template
        }
      );

      if (result.success) {
        toast({
          title: 'Goal Created! 🎉',
          description: 'AI is now generating your daily action plan...',
        });

        navigate({ to: '/dashboard' });
      }
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
    
    // Clear error for this field when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
    
    // For text fields, also validate in real-time if there's content
    if (typeof value === 'string' && value.trim() !== '') {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
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
        const listField = field as ListField;
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header Bar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center justify-between py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: '/goal/create' })}
              className="hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentSection + 1} of {template.sections.length}
              </div>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-8 sm:py-12">
        {/* Template Header */}
        <div className="text-center mb-12">
          <div 
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl mx-auto mb-6 flex items-center justify-center text-6xl sm:text-7xl shadow-2xl transform hover:scale-105 transition-transform"
            style={{ background: template.color }}
          >
            {template.icon}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
            {template.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            {template.description}
          </p>
        </div>

        {/* Section Navigation Breadcrumb */}
        <div className="mb-8">
          <div className="flex gap-2 justify-center flex-wrap">
            {template.sections.map((sec, idx) => (
              <button
                key={sec.id}
                onClick={() => setCurrentSection(idx)}
                disabled={idx > currentSection}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed ${
                  idx === currentSection
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : idx < currentSection
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                }`}
              >
                {idx < currentSection && <Check className="w-4 h-4 inline mr-1" />}
                {sec.icon && <span className="mr-2">{sec.icon}</span>}
                {sec.title}
              </button>
            ))}
          </div>
        </div>

        {/* Current Section Card */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          {/* Section Header */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 border-b border-gray-200 dark:border-gray-700 px-6 sm:px-8 py-6">
            <div className="flex items-center gap-4 mb-2">
              {section.icon && (
                <span className="text-4xl sm:text-5xl">{section.icon}</span>
              )}
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {section.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section Fields */}
          <div className="px-6 sm:px-8 py-8 space-y-6">
            {section.fields.map(field => renderField(field))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentSection === 0}
            size="lg"
            className="min-w-[120px] border-2 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>

          {currentSection === template.sections.length - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={isCreating}
              size="lg"
              className="min-w-[160px] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
            >
              {isCreating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Create Goal
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              size="lg"
              className="min-w-[120px] bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg"
            >
              Next
              <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
