import { Text, View, StyleSheet } from 'react-native';

export default function tripList() {
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#25292e',
            alignItems: 'center',
            justifyContent: 'center',
        },
        text: {
            color: '#fff',
        },
    }
    )

    return (
        <View>
            <Text>
                Titeadaa
            </Text>
        </View>
    );
}