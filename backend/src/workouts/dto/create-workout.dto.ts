import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExerciseDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(1)
  sets!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsInt()
  @Min(0)
  order!: number;
}

export class CreateWorkoutDayDto {
  @IsInt()
  @Min(1)
  dayNumber!: number;

  @IsString()
  @MaxLength(100)
  muscleGroup!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExerciseDto)
  exercises?: CreateExerciseDto[];
}

export class CreateWorkoutPlanDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsInt()
  @Min(1)
  days!: number;

  @IsOptional()
  @IsBoolean()
  isPrebuilt?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreateWorkoutDayDto)
  workoutDays?: CreateWorkoutDayDto[];
}
