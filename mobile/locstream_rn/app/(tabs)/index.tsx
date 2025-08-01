import { Image } from 'expo-image';
import { StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';

import { useState, useEffect, useRef } from 'react';

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PlatformPressable } from '@react-navigation/elements';

import AsyncStorage from '@react-native-async-storage/async-storage';
import Card from '@/components/ui/Card';



const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: {data: {locations: [Location.LocationObject]}, error: any}) => {
  if (error) {
      console.error('Background location task error:', error);
      return;
    }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      await AsyncStorage.setItem('latestLocation', JSON.stringify(location));
      // // Send a notification
      // await Notifications.scheduleNotificationAsync({
      //   content: {
      //     title: '📍 Current Location',
      //     body: `Latitude: ${location.coords.latitude.toFixed(4)}, Longitude: ${location.coords.longitude.toFixed(4)}`,
      //     sound: false, // No sound for frequent updates
      //     priority: Notifications.AndroidNotificationPriority.LOW,
      //     vibrate: [0],
      //   },
      //   trigger: null, // Send immediately
      // });
    }
  }
});

// // --- 2. Configure Notification Handler ---
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: false,
//     shouldSetBadge: false,
//   }),
// });


const requestPermissions = async () => {
  console.log("gotten");
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  console.log(foregroundStatus);
  if (foregroundStatus === 'granted') {
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    console.log(backgroundStatus);
    if (backgroundStatus === 'granted') {
      console.log("ok")
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
      }).catch(console.error);
      console.log("gotten");
    }
  }
};

export default function HomeScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [count, setCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);


  useEffect(() => {


    // This function handles starting and stopping location updates.
    const manageLocationTracking = async () => {
      // Check if background tracking is active
      const isTrackingBackground = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);

      if (isTracking) {
        // --- Start tracking ---
        // Request permissions first
        const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
        if (foregroundStatus !== 'granted') {
          setErrorMsg('Foreground location permission to access location was denied');
          setIsTracking(false);
          return;
        }

        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          setErrorMsg('Background location permission to access location was denied');
          setIsTracking(false);
          return;
        }
        
        // Request notification permissions
        // const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
        // if (notificationStatus !== 'granted') {
        //     alert('Notification permissions are required for background updates!');
        //     setIsTracking(false);
        //     return;
        // }


        // Start foreground location updates
        // const locationSubscription = await Location.watchPositionAsync(
        //   {
        //     accuracy: Location.Accuracy.BestForNavigation,
        //     timeInterval: 1000, // 1 second
        //     distanceInterval: 1, // 1 meter
        //   },
        //   (newLocation: Location.LocationObject | null) => {
        //     setLocation(newLocation);
        //     setErrorMsg(null);
        //   }
        // );

        // Start background location updates
        if (!isTrackingBackground) {
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 5000, // 5 seconds for background
                distanceInterval: 10, // 10 meters
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                    notificationTitle: 'Tracking your location',
                    notificationBody: 'The app is tracking your location in the background.',
                    notificationColor: '#333333',
                },
            });
        }

        // set current location 
        const storedLocation = await AsyncStorage.getItem('latestLocation');
        // console.log("Stored in background", storedLocation);
        if (storedLocation !== null) {
          const loc = JSON.parse(storedLocation) as Location.LocationObject
          setLocation(loc);
        }
        
        setCount((count) => count + 1);
        
        // return () => {
        //   // Cleanup: stop foreground watcher
        //   locationSubscription.remove();
        // };
        return;

      } else {
        // --- Stop tracking ---
        if (isTrackingBackground) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
        // setLocation(null); // Clear location on screen // keep last location on screen
      }
    };

    async function getCurrentLocation() {
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }      

      const storedLocation = await AsyncStorage.getItem('latestLocation');
      // console.log("Stored in background", storedLocation);
      if (storedLocation !== null) {
        const loc = JSON.parse(storedLocation) as Location.LocationObject
        setLocation(loc);
      }
      
      setCount((count) => count + 1);
    }

    // getCurrentLocation();
    manageLocationTracking();
    const intervalId = setInterval(() => {
      // getCurrentLocation();
      manageLocationTracking();
    }, 2000);

    return () => {
      clearInterval(intervalId);
    }
  }, [isTracking]);


  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <CurrentLocationCard location={location}/>
      <ThemedView style={styles.stepContainer}>
      <LocationsTrackedCard count={count}/>
      </ThemedView>

      <StartTrackingCard isTracking={isTracking} setIsTracking={setIsTracking}/>
      <ActiveSessionsCard/>

      <SessionCard isTracking={isTracking}/>

      <RealTimeSyncCard/>

    </ParallaxScrollView>
  );
}

type StartTrackingCardProp = {
  isTracking: boolean,
  setIsTracking: React.Dispatch<React.SetStateAction<boolean>>
}

function StartTrackingCard({isTracking, setIsTracking}: StartTrackingCardProp) {
  return <Card>
     <Button 
      title={isTracking ? 'Stop Tracking' : 'Start Tracking'}
      onPress={() => setIsTracking(prev => !prev)}
      color={isTracking ? '#ff5c5c' : '#4CAF50'} 
    />
  </Card>
}


function SessionCard({isTracking}: {isTracking: boolean}) {
  return <Card>
     <Button 
      title="📍 Start New Session"
      onPress={() => {
        if (!isTracking) {
          alert("Turn on tracking to start a session")
        } else {
          console.log("new session started")
        }
        
      }}
    />
  </Card>
}

type CurrentLocationProp = {
  location: Location.LocationObject | null
}

function CurrentLocationCard({location}: CurrentLocationProp) {
  

  if (location === null) {
    return <Card>
     <ThemedText type='title'>
      Current Location
     </ThemedText>
     <ThemedText>
      No location data
     </ThemedText>
    </Card>
  }

  const now = Date.now();

  return <Card>
    <ThemedText type="title">
      Current Location
    </ThemedText>

    <ThemedText>
      {location.coords.latitude.toFixed(6) + '\u00B0'}{' '}{getLatitudeHemisphere(location.coords.latitude)},
      {' '}
      {location.coords.latitude.toFixed(6) + '\u00B0'}{' '}{getLongitudeHemisphere(location.coords.longitude)}
    </ThemedText>

    <ThemedView style={styles.row}>
       <ThemedText>
        Accuracy: {location.coords.accuracy ? `+/- ${location.coords.accuracy.toFixed(2)} m` : 'N/A'}
      </ThemedText>
      <ThemedText>
        Altitude: {location.coords.altitude ? `${location.coords.altitude.toFixed(2)} m` : 'N/A'}
      </ThemedText>
    </ThemedView>
   
    <ThemedText>
      {timeAgoFromUnix(now, location.timestamp)}
    </ThemedText>
  </Card>

}

function getLatitudeHemisphere(latitude: number): 'N' | 'S' {
  return latitude >= 0 ? 'N' : 'S';
}

function getLongitudeHemisphere(longitude: number): 'E' | 'W' {
  return longitude >= 0 ? 'E' : 'W';
}

function timeAgoFromUnix(now: number, unixTimestamp: number): string {
  const secondsElapsed = Math.floor((now - unixTimestamp)/1_000);

  if (secondsElapsed < 5) return "now";
  if (secondsElapsed < 60) return `${secondsElapsed}s ago`;
  if (secondsElapsed < 3600) return `${Math.floor(secondsElapsed / 60)}m ago`;
  if (secondsElapsed < 86400) return `${Math.floor(secondsElapsed / 3600)}h ago`;
  if (secondsElapsed < 604800) return `${Math.floor(secondsElapsed / 86400)}d ago`;

  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString(); // fallback: show actual date
}



function ActiveSessionsCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [sessionCount, setSessionCount] = useState<number|undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    async function fetchSessionCount() {
      setIsLoading(true);
      await new Promise<void>(resolve => {
        setTimeout(() => {
          resolve();
        }, 1_000)
      });
      setSessionCount(10)
      setIsLoading(false);
    }

    fetchSessionCount();
    const intervalId = setInterval(() => fetchSessionCount(), 5_000);

    return () => clearInterval(intervalId);

  }, [])


  let inner = (
    `Number of Sessions: ${sessionCount}`
  )
  if (isLoading) {
    inner = 'Loading...'
  }

  return <PlatformPressable disabled={isLoading} onPressIn={() => 
    {
      if(isLoading) return;
      router.navigate("/(tabs)/sessions")
    }
  }>
    <Card>
      <ThemedText>
       {inner}
      </ThemedText>
    </Card>
  </PlatformPressable> 
}

function LocationsTrackedCard({count}: {count: number | undefined}) {
  const [isLoading, setIsLoading] = useState(false);
  // const [locationsCount, setLocationsCount] = useState<number|undefined>(count);
  const router = useRouter();
  const locationsCount = count

  // useEffect(() => {
  //   async function fetchLocationsCount() {
  //     setIsLoading(true);
  //     await new Promise<void>(resolve => {
  //       setTimeout(() => {
  //         resolve();
  //       }, 1_000)
  //     });
  //     // setLocationsCount(count => {
  //     //   if (count === undefined) return 10;
  //     //   return count
  //     // })
  //     setIsLoading(false);
  //   }

  //   fetchLocationsCount();
  //   const intervalId = setInterval(() => fetchLocationsCount(), 5_000);

  //   return () => clearInterval(intervalId);

  // }, [])


  let inner = (
    `Number of Locations Tracked: ${locationsCount}`
  )
  if (isLoading) {
    inner = 'Loading...'
  }

  return <PlatformPressable disabled={isLoading} onPressIn={() => 
    {
      if(isLoading) return;
      router.navigate("/(tabs)/live")
    }
  }>
    <Card>
      <ThemedText>
       {inner}
      </ThemedText>
    </Card>
  </PlatformPressable> 
}





function RealTimeSyncCard() {

  return <Card>
    <Button title='☁️ Turn on RealTime sync' color="#34C759"/>
  </Card>
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
  row: {
    flex: 1,
    flexDirection: "row",
    gap: 10,
    backgroundColor: '0x0000'
  }
});