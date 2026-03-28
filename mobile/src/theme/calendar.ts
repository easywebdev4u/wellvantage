import { colors } from './index';

export const calendarTheme = {
  backgroundColor: colors.white,
  calendarBackground: colors.white,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors.white,
  todayTextColor: colors.primary,
  dayTextColor: colors.text,
  textDisabledColor: colors.textTertiary,
  dotColor: colors.primary,
  selectedDotColor: colors.white,
  arrowColor: colors.primary,
  monthTextColor: colors.text,
  textMonthFontWeight: '600' as const,
  textDayFontSize: 14,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 13,
} as const;
