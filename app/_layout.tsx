import { Stack } from "expo-router";
import { NotifierWrapper } from 'react-native-notifier';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function RootLayout() {
  return (

    <GestureHandlerRootView>
      <NotifierWrapper>
        <Stack screenOptions={{
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerShadowVisible: false,
          headerTintColor: '#fff',
        }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
              headerShown: false 
            }}
          />
          <Stack.Screen
            name="trip_list_details/[id]"
            options={{
              title: 'Trip Details', // Set the title here
            }}
          />
          <Stack.Screen
            name="trip_list_branch/[id]"
            options={{
              title: 'Trip Branch', // Set the title here
            }}
          />
          <Stack.Screen
            name="outslip_upload/[id]"
            options={{
              title: 'Upload', // Set the title here
            }}
          />
          <Stack.Screen
            name="manage_upload/manage_upload"
            options={{
              title: 'View Uploads', // Set the title here
            }}
          />
          <Stack.Screen
            name="manage_upload/[id]"
            options={{
              title: 'View Upload', // Set the title here
            }}
          />
          <Stack.Screen
            name="manage_attendance/manage_attendance"
            options={{
              title: 'View Attendance', // Set the title here
            }}
          />
        </Stack>
      </NotifierWrapper>
    </GestureHandlerRootView>

  );
}

