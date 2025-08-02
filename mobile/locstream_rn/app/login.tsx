import { View, Text, StyleSheet } from "react-native"



export default function Main() {

    return <View>
        <Text style={styles.text}>Hello</Text>
    </View>
}


const styles = StyleSheet.create({
    text: {
        color: "#F00"
    }
})