import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: '#25292e',
      },
      headerShadowVisible: false,
      headerTintColor: '#fff',
    }}>
      <Stack.Screen
        name="register"
        options={{
          title: '', // Set the title here
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          title: '', // Set the title here
        }}
      />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

