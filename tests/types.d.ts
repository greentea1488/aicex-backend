// Глобальные типы для тестов
declare global {
  var createMockUser: (overrides?: any) => any;
  var createMockTask: (overrides?: any) => any;
  
  namespace NodeJS {
    interface Global {
      createMockUser: (overrides?: any) => any;
      createMockTask: (overrides?: any) => any;
    }
  }
}

export {};
