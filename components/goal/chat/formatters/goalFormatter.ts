
import { GoalData } from "../types";

/**
 * Format and validate goal data from AI response
 */
export const formatGoalData = (goalData: GoalData): GoalData => {
  // Create a copy of the goal data to avoid mutating the original
  const formattedGoal = { ...goalData };
  
  // Ensure dates are in proper format YYYY-MM-DD
  if (formattedGoal.start_date) {
    // Handle possible date formats from AI
    formattedGoal.start_date = formatDateValue(formattedGoal.start_date);
  } else {
    // Default to today if no start date is provided
    formattedGoal.start_date = new Date().toISOString().split('T')[0];
  }
  
  // Ensure target date is valid
  if (formattedGoal.target_date) {
    formattedGoal.target_date = formatDateValue(formattedGoal.target_date);
  } else {
    // Default to one month from start date
    const targetDate = new Date(formattedGoal.start_date);
    targetDate.setMonth(targetDate.getMonth() + 1);
    formattedGoal.target_date = targetDate.toISOString().split('T')[0];
  }
  
  // Ensure proper goal formatting
  formattedGoal.title = capitalizeFirstLetter(formattedGoal.title.trim());
  formattedGoal.description = formattedGoal.description.trim();
  
  // Cast goal_type to the correct type
  const validGoalTypes = ["general", "financial", "travel"] as const;
  const goalType = formattedGoal.goal_type.toLowerCase().trim();
  formattedGoal.goal_type = validGoalTypes.includes(goalType as any) 
    ? (goalType as "general" | "financial" | "travel") 
    : "general";
  
  // If start date is after target date, swap them
  const startDate = new Date(formattedGoal.start_date);
  const targetDate = new Date(formattedGoal.target_date);
  
  if (startDate > targetDate) {
    console.log("Start date is after target date, swapping dates");
    const tempDate = formattedGoal.start_date;
    formattedGoal.start_date = formattedGoal.target_date;
    formattedGoal.target_date = tempDate;
  }
  
  return formattedGoal;
};

/**
 * Format a date value to ensure it's in YYYY-MM-DD format
 */
const formatDateValue = (dateValue: string): string => {
  try {
    // For dates already in proper format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // For common date formats like MM/DD/YYYY, DD/MM/YYYY
    const date = new Date(dateValue);
    
    // Check if valid date
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error("Error formatting date:", error);
    // Return today's date if we can't parse the provided date
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Capitalize the first letter of a string
 */
const capitalizeFirstLetter = (string: string): string => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

// Define the TravelDetails interface 
interface TravelDetails {
  destination: string;
  start_date: string;
  end_date: string;
  budget: string;
  accommodation: string;
  transportation: string;
  activities: string[];
  notes: string;
}

/**
 * Formats travel details from form data
 */
export const formatTravelDetails = (formData: any): TravelDetails => {
  return {
    destination: formData.destination || '',
    start_date: formData.travel_start_date || '',
    end_date: formData.travel_end_date || '',
    budget: formData.budget || '',
    accommodation: formData.accommodation || '',
    transportation: formData.transportation || '',
    activities: formData.activities || [],
    notes: formData.notes || ''
  };
};

/**
 * Creates a goal data object from form data
 */
export const createGoalDataFromForm = (formData: any): GoalData => {
  return {
    title: formData.title || '',
    description: formData.description || '',
    target_date: formData.target_date || '',
    start_date: formData.start_date || new Date().toISOString().split('T')[0],
    // Ensure goal_type is one of the valid types
    goal_type: (formData.goal_type as "general" | "financial" | "travel") || "general",
    travel_details: formData.goal_type === 'travel' ? formatTravelDetails(formData) : null
  };
};
