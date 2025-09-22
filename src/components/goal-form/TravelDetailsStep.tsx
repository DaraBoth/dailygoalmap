import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, MapPin, Hotel, Car, Compass } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { GoalFormValues, travelActivities } from "./types";

interface TravelDetailsStepProps {
  form: UseFormReturn<GoalFormValues>;
  onPrevStep: () => void;
  onNextStep: () => void;
  selectedActivities: string[];
  toggleActivity: (activity: string) => void;
  compact?: boolean;
}

const TravelDetailsStep = ({ 
  form, 
  onPrevStep, 
  onNextStep, 
  selectedActivities, 
  toggleActivity,
  compact = false
}: TravelDetailsStepProps) => {
  return (
    <>
      <div className="mb-4">
        <h2 className={`${compact ? "text-lg" : "text-xl"} font-bold text-foreground mb-2`}>Travel Details</h2>
        {!compact && (
          <p className="text-muted-foreground mb-3">
            Provide more information about your trip to get better AI-generated tasks
          </p>
        )}
        
        <FormField
          control={form.control}
          name="travel_destination"
          render={({ field }) => (
            <FormItem className="mb-3">
              <FormLabel>
                <MapPin className="h-4 w-4 inline mr-1" />
                Destination
              </FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., Tokyo, Japan or Multiple European cities" 
                  {...field} 
                  className="bg-background text-foreground" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="travel_accommodation"
            render={({ field }) => (
              <FormItem className="mb-3">
                <FormLabel>
                  <Hotel className="h-4 w-4 inline mr-1" />
                  Accommodation
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select accommodation type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="hostel">Hostel</SelectItem>
                    <SelectItem value="airbnb">Airbnb/Rental</SelectItem>
                    <SelectItem value="camping">Camping</SelectItem>
                    <SelectItem value="resort">Resort</SelectItem>
                    <SelectItem value="multiple">Multiple Types</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="travel_transportation"
            render={({ field }) => (
              <FormItem className="mb-3">
                <FormLabel>
                  <Car className="h-4 w-4 inline mr-1" />
                  Transportation
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select transportation method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flight">Flight</SelectItem>
                    <SelectItem value="train">Train</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="cruise">Cruise</SelectItem>
                    <SelectItem value="multiple">Multiple Methods</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="travel_budget"
          render={({ field }) => (
            <FormItem className="mb-3">
              <FormLabel>Budget Range</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select budget range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget ($)</SelectItem>
                  <SelectItem value="moderate">Moderate ($$)</SelectItem>
                  <SelectItem value="luxury">Luxury ($$$)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="mb-3">
          <FormLabel>
            <Compass className="h-4 w-4 inline mr-1" />
            Activities & Interests
          </FormLabel>
          <div className="flex flex-wrap gap-2 mt-2">
            {(compact ? travelActivities.slice(0, 8) : travelActivities).map(activity => (
              <Badge 
                key={activity}
                variant={selectedActivities?.includes(activity) ? "default" : "outline"} 
                className={`cursor-pointer ${selectedActivities?.includes(activity) ? 'bg-primary' : ''}`} 
                onClick={() => toggleActivity(activity)}
              >
                {activity}
                {selectedActivities?.includes(activity) && "✓"} 
              </Badge>
            ))}
          </div>
          {compact && selectedActivities?.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {selectedActivities.length} activities selected
            </p>
          )}
        </div>
      </div>
      
      <div className="flex justify-between mt-4">
        <Button
          type="button"
          onClick={onPrevStep}
          variant="outline"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Basic Info
        </Button>
        
        <Button
          type="button"
          onClick={onNextStep}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          Next: AI Settings
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </>
  );
};

export default TravelDetailsStep;
