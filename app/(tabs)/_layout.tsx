import { Tabs } from "expo-router"
import Ionicons from '@expo/vector-icons/Ionicons'
export default function BotTab() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#ffd33d',
                headerStyle: {
                    backgroundColor: '#25292e',
                },
                headerShadowVisible: false,
                headerTintColor: '#fff',
                tabBarStyle: {
                    backgroundColor: '#25292e',
                }
            }}>
            <Tabs.Screen name="index" options={{
                title: 'Log in', tabBarIcon: ({ color, focused }) => (
                    <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
                ),
            }} />
            <Tabs.Screen name="trip_list" options={{
                title: 'Trip List',
                tabBarIcon: ({ color, focused }) => (
                    <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} color={color} size={24} />
                ),
            }}
            />
        </Tabs>
    )
}