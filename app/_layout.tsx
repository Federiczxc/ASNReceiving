import { Stack } from "expo-router";
import { NotifierWrapper } from 'react-native-notifier';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Updates from 'expo-updates'
import { Alert } from "react-native";
import React, { useEffect } from "react"
export default function RootLayout() {

  async function checkForUpdates() {
    try {
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        Alert.alert(
          'Update Available',
          'A new version of the app is available. Restart app to update?\n\nApp will still auto-update next launch.',
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'Update now',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                Updates.reloadAsync(); // Force restart
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Update check failed:', error);
    }
  }

  // Call in useEffect or App component
  useEffect(() => {
    checkForUpdates();
  }, []);

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

