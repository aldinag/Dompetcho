import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToExpenseForm(params: RootStackParamList['ExpenseForm']) {
  if (!navigationRef.isReady()) return;
  navigationRef.navigate('ExpenseForm', params);
}
