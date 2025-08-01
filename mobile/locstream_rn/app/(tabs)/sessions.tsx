import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';

import { Collapsible } from '@/components/Collapsible';
import { ExternalLink } from '@/components/ExternalLink';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import Card from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { FlatList } from 'react-native';
import ParallaxFlatList from '@/components/ParallaxFlatList';

const DATA = [
  { id: '1', name: 'Session 1' },
  { id: '2', name: 'Session 2' },
  { id: '3', name: 'Session 3' },
  { id: '4', name: 'Session 4' },
];

export default function SessionsScreen() {

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="calendar"
          style={styles.headerImage}
        />
      }>

        <FlatList
          data={DATA}
          renderItem={ (item) => <View style={styles.listItem}><Card><ThemedText key={item.index}>{item.item.name}</ThemedText></Card></View>}
        />
  
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  listItem: {
    marginTop: 8
  }
});
