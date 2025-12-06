import React from "react";
import { UseFormReturn } from "react-hook-form";
import { GoalFormValues } from "./types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, DollarSign, User, Calendar, AlertCircle, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserContextStepProps {
  form: UseFormReturn<GoalFormValues>;
  onPrevStep?: () => void;
  onNextStep?: () => void;
}

const UserContextStep = ({ form, onPrevStep, onNextStep }: UserContextStepProps) => {
  const goalType = form.watch('goal_type');
  const isFinancialGoal = goalType === 'finance' || goalType === 'financial';

  return (
    <div className="space-y-6">
      {/* Header with explanation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Help AI Create Your Perfect Plan
          </CardTitle>
          <CardDescription>
            Tell us about your schedule and lifestyle so AI can generate tasks that fit YOUR real life—no conflicts, no unrealistic expectations.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Daily Schedule Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            Your Daily Schedule
          </CardTitle>
          <CardDescription>
            AI will avoid scheduling tasks during your busy times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="user_context.wake_up_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wake Up Time</FormLabel>
                  <FormControl>
                    <Input type="time" placeholder="06:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="user_context.sleep_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sleep Time</FormLabel>
                  <FormControl>
                    <Input type="time" placeholder="22:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="user_context.work_start_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work/School Start</FormLabel>
                  <FormControl>
                    <Input type="time" placeholder="09:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="user_context.work_end_time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Work/School End</FormLabel>
                  <FormControl>
                    <Input type="time" placeholder="17:00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="user_context.available_time_per_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Available Time Per Day</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="How much time can you dedicate?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="15-30 minutes">15-30 minutes</SelectItem>
                    <SelectItem value="30 minutes - 1 hour">30 minutes - 1 hour</SelectItem>
                    <SelectItem value="1-2 hours">1-2 hours</SelectItem>
                    <SelectItem value="2-3 hours">2-3 hours</SelectItem>
                    <SelectItem value="3+ hours">3+ hours</SelectItem>
                    <SelectItem value="flexible">Flexible schedule</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.preferred_work_times"
            render={({ field }) => (
              <FormItem>
                <FormLabel>When do you work best?</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your peak productivity time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="early_morning">Early Morning (5am-8am)</SelectItem>
                    <SelectItem value="morning">Morning (8am-12pm)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12pm-5pm)</SelectItem>
                    <SelectItem value="evening">Evening (5pm-9pm)</SelectItem>
                    <SelectItem value="night">Night (9pm+)</SelectItem>
                    <SelectItem value="varies">Varies by day</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  AI will prioritize scheduling important tasks during this time
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.other_commitments"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Regular Commitments</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="E.g., Gym Mon/Wed/Fri 6-7pm, Kids pickup at 3pm daily, Church Sunday 10am..."
                    className="min-h-[80px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  List any recurring activities AI should avoid scheduling over
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Financial Context (Show only for financial goals) */}
      {isFinancialGoal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Financial Situation
            </CardTitle>
            <CardDescription>
              AI will create a realistic savings plan based on your actual finances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="user_context.monthly_income"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Income</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="3000" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="user_context.monthly_expenses"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Expenses</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="2000" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="user_context.current_savings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Savings</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="500" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="user_context.debt_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outstanding Debt (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="user_context.financial_obligations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Major Financial Obligations</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="E.g., Rent $1000/month, Car payment $300/month, Student loan $200/month..."
                      className="min-h-[60px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Helps AI create a realistic savings plan you can actually stick to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Personal Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" />
            Personal Context
          </CardTitle>
          <CardDescription>
            Helps AI understand your situation and create appropriate tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="user_context.age_range"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age Range</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select age range" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="18-25">18-25</SelectItem>
                      <SelectItem value="26-35">26-35</SelectItem>
                      <SelectItem value="36-50">36-50</SelectItem>
                      <SelectItem value="50+">50+</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="user_context.living_situation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Living Situation</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select situation" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="alone">Live alone</SelectItem>
                      <SelectItem value="family">With family</SelectItem>
                      <SelectItem value="roommates">With roommates</SelectItem>
                      <SelectItem value="partner">With partner</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="user_context.occupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Occupation/Current Role</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Software Engineer, Student, Parent, Freelancer..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.family_responsibilities"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Family Responsibilities (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., 2 kids under 5, Elderly parent care, None..." {...field} />
                </FormControl>
                <FormDescription>
                  AI will account for family time in task scheduling
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Goal-Specific Context */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-4 h-4" />
            About This Goal
          </CardTitle>
          <CardDescription>
            Help AI understand your starting point and challenges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="user_context.current_skill_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Current Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="How experienced are you?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="complete_beginner">Complete Beginner</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  AI will adjust task difficulty and provide more guidance for beginners
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.past_experience"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relevant Past Experience</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="E.g., Tried this before but gave up after 2 weeks, Completed similar goal last year..."
                    className="min-h-[60px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Share what worked or didn't work before
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.known_obstacles"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Challenges</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="E.g., Lack of motivation in mornings, Budget is tight, Limited knowledge, Time management..."
                    className="min-h-[60px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  AI will help you plan around these obstacles
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.motivation_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Motivation Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="How motivated are you?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="very_high">Very High - I'm all in!</SelectItem>
                    <SelectItem value="high">High - Ready to commit</SelectItem>
                    <SelectItem value="medium">Medium - Need some structure</SelectItem>
                    <SelectItem value="low">Low - Need lots of support</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  AI will adjust accountability and reminder frequency
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="user_context.special_notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Anything Else AI Should Know?</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="E.g., Health conditions, upcoming vacation, prefer visual guides, work night shifts..."
                    className="min-h-[60px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          This information is used solely to generate personalized tasks. It's stored securely with your goal and never shared.
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevStep}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onNextStep}
            className="flex items-center gap-2"
          >
            Skip for Now
          </Button>
          <Button
            type="button"
            onClick={onNextStep}
            className="flex items-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserContextStep;
