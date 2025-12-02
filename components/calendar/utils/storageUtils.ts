
export function getFinancialDataFromLocalStorage(goalId: string): any {
  const financialDataStr = localStorage.getItem('financialData');
  if (financialDataStr) {
    const financialDataArray = JSON.parse(financialDataStr);
    return financialDataArray.find((data: any) => data.goalId === goalId);
  }
  return null;
}
