import {
  IsString,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateWorkoutPlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}

export class UpdateWorkoutDayDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  muscleGroup?: string;
}

export class UpdateExerciseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
