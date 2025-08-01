import { StyleSheet } from "react-native";

import { ThemedView } from "../ThemedView";


export default function Card({children}: any) {

  return <ThemedView style={styles.card}>
    {children}
  </ThemedView>
}


const styles = StyleSheet.create({
    card: {
    backgroundColor: '#1C1C1E', // dark gray card on black bg
    borderRadius: 12,
    padding: 16,
    marginTop: 1,

    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,

    // Android shadow
    elevation: 5,
  },
})