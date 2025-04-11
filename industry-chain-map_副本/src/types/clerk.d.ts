import '@clerk/nextjs';

declare module '@clerk/nextjs' {
  // 扩展ClerkProvider的props类型，确保正确处理localization
  interface ClerkProviderProps {
    localization?: object;
    // 添加其他Clerk类型属性...
  }
}

declare module '@clerk/localizations' {
  // 确保zhCN的类型正确
  export const zhCN: Record<string, string>;
} 