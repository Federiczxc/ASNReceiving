import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function BotTab() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#ffd33d", //4caf50
                headerStyle: { backgroundColor: "#25292e" },
                headerShadowVisible: false,
                headerTintColor: "#fff",
                tabBarStyle: { backgroundColor: "#25292e" },
            }}
        >
            <Tabs.Screen name="profile" options={{
                title: "My Profile",
                tabBarIcon: ({ color, focused }) => (
                    <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color} size={24} />
                ),
                headerShown: false,
            }} />
            <Tabs.Screen name="trip_list" options={{
                title: "Trip List",
                tabBarIcon: ({ color, focused }) => (
                    <Ionicons name={focused ? "navigate" : "navigate-outline"} color={color} size={24} />
                ),
                headerShown: false,
            }} />
            <Tabs.Screen name="trip_list2" options={{
                title: "OCR",
                tabBarIcon: ({ color, focused }) => (
                    <Ionicons name={focused ? "aperture" : "aperture-outline"} color={color} size={24} />
                ),
            }} />
        </Tabs>
    );
}
