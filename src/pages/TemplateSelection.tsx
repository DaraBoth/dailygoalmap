import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { goalTemplates } from '@/data/goalTemplates/index';
import type { GoalTemplate } from '@/types/goalTemplate';
import { Search, ArrowRight, ArrowLeft } from 'lucide-react';

export function TemplateSelectionPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTemplates = goalTemplates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTemplate = (template: GoalTemplate) => {
    const route = '/goal/create-from-template/$templateId' as const;
    navigate({ 
      to: route,
      params: { templateId: template.id } as never
    });
  };

  const categories = Array.from(new Set(goalTemplates.map(t => t.category)));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Back Button */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/dashboard' })}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Create Goal from Template
        </h1>
        <p className="text-muted-foreground text-lg">
          Choose a template to get started with pre-configured AI prompts and structured data
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {categories.map(category => {
          const count = goalTemplates.filter(t => t.category === category).length;
          return (
            <Button
              key={category}
              variant="outline"
              size="sm"
              className="capitalize"
            >
              {category} ({count})
            </Button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No templates found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id}
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-primary/50"
              onClick={() => handleSelectTemplate(template)}
            >
              <CardHeader>
                <div 
                  className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-4xl shadow-lg"
                  style={{ background: template.color }}
                >
                  {template.icon}
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  {template.name}
                </CardTitle>
                <CardDescription className="line-clamp-3">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-muted-foreground px-3 py-1 bg-secondary rounded-full">
                    {template.category}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {template.sections.length} sections • {template.sections.reduce((acc, s) => acc + s.fields.length, 0)} fields
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Custom Goal Option */}
      <div className="mt-12 border-t pt-8">
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Don't see what you need?</CardTitle>
            <CardDescription>
              Create a custom goal without using a template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline"
              onClick={() => navigate({ to: '/goal/create-custom' })}
            >
              Create Custom Goal
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
