import { useRef, type PropsWithChildren, type ReactElement } from 'react';
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';

// import Animated, {
//   interpolate,
//   useAnimatedRef,
//   useAnimatedStyle,
//   useScrollViewOffset,
// } from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { useBottomTabOverflow } from '@/components/ui/TabBarBackground';
import { useColorScheme } from '@/hooks/useColorScheme';


const HEADER_HEIGHT = 250;
const screenWidth = Dimensions.get('window').width;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
  data: any
}>;

export default function ParallaxFlatList({
  headerImage,
  headerBackgroundColor,
  data
}: Props) {
  const scrollY = useRef(new Animated.Value(0)).current;

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>{item.title}</Text>
    </View>
  );

  const headerTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <Animated.Image
        source={{ uri: 'https://picsum.photos/800/600' }}
        style={[
          styles.headerImage,
          {
            transform: [{ translateY: headerTranslate }, { scale: imageScale }],
          },
        ]}
        resizeMode="cover"
      />

      <Animated.FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    padding: 32,
    gap: 16,
    overflow: 'hidden',
  },
  // container: {
  //   flex: 1,
  //   backgroundColor: '#000',
  // },
  headerImage: {
    position: 'absolute',
    width: screenWidth,
    height: HEADER_HEIGHT,
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  item: {
    padding: 20,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
    backgroundColor: '#1c1c1e',
  },
  itemText: {
    color: '#fff',
    fontSize: 18,
  },
});
