import { Text, View, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Link, Slot } from 'expo-router';

export default function LoginPage() {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#25292e',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    text: {
      color: '#fff',
      fontSize: 24,
      marginBottom: 20,
    },
    input: {
      width: '100%',
      height: 40,
      borderColor: '#fff',
      borderWidth: 1,
      borderRadius: 5,
      paddingHorizontal: 10,
      marginBottom: 20,
      color: '#fff',
    },
    button: {
      backgroundColor: 'green',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
    },
    link: {
      marginTop: 20,
      color: 'green',
      textDecorationLine: 'underline',
    }
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#aaa"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#aaa"
        secureTextEntry
      />
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}
