import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Text, Button } from 'react-native';

import { useState, useEffect } from 'react';

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';



// const LOCATION_TASK_NAME = 'background-location-task';
// const requestPermissions = async () => {
//   const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
//   if (foregroundStatus === 'granted') {
//     const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
//     if (backgroundStatus === 'granted') {
//       await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
//         accuracy: Location.Accuracy.Balanced,
//       });
//     }
//   }
// };

// const PermissionsButton = () => (
//   <View style={styles.container}>
//     <Button onPress={requestPermissions} title="Enable background location" />
//   </View>
// );


// TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
//   if (error) {
//     // Error occurred - check `error.message` for more details.
//     return;
//   }
//   if (data) {
//     const { locations } = data;
//     // do something with the locations captured in the background
//   }
// });


export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [count, setCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);


   useEffect(() => {
    async function getCurrentLocation() {
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      setCount((count) => count + 1)
    }

    

    getCurrentLocation();
    const intervalId = setInterval(() => {
      getCurrentLocation()
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  let text = 'Waiting...';
  if (errorMsg) {
    text = errorMsg;
  } else if (location) {
    text = JSON.stringify(location);
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>

        <ThemedText type="subtitle">Count: {count}</ThemedText>
      </ThemedView>

      {
        location 
        ? (<View style={styles.infoContainer}>
          <Text style={styles.label}>Latitude:</Text>
          <Text style={styles.value}>{location.coords.latitude.toFixed(25)}</Text>
          <Text style={styles.label}>Longitude:</Text>
          <Text style={styles.value}>{location.coords.longitude.toFixed(25)}</Text>
          <Text style={styles.label}>Altitude:</Text>
          <Text style={styles.value}>
            {location.coords.altitude ? `${location.coords.altitude.toFixed(2)} m` : 'N/A'}
          </Text>
          <Text style={styles.label}>Accuracy:</Text>
          <Text style={styles.value}>
            {location.coords.accuracy ? `+/- ${location.coords.accuracy.toFixed(2)} m` : 'N/A'}
          </Text>
        </View>)
      : null
      }


    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  value: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
  },
  buttonContainer: {
    marginTop: 20,
  },
});
