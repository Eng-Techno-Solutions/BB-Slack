import React, { Component } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableHighlight,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { EMOJI_MAP, getTwemojiUrl } from '../utils/emoji';
import { getColors } from '../theme';

var IS_ANDROID = Platform.OS === 'android';

var ALL_EMOJIS = Object.keys(EMOJI_MAP).reduce(function (acc, name) {
  var emoji = EMOJI_MAP[name];
  if (acc.seen[emoji]) return acc;
  acc.seen[emoji] = true;
  var url = IS_ANDROID ? getTwemojiUrl(emoji) : null;
  if (IS_ANDROID && !url) return acc;
  acc.list.push({ name: name, emoji: emoji, url: url });
  return acc;
}, { list: [], seen: {} }).list;

function EmojiImage(props) {
  return React.createElement(Image, {
    source: { uri: props.url },
    style: styles.emojiImg,
    defaultSource: undefined,
  });
}

export default class EmojiPicker extends Component {
  constructor(props) {
    super(props);
    this.state = { search: '' };
    this._renderItem = this._renderItem.bind(this);
  }

  getFiltered() {
    var q = this.state.search.toLowerCase().trim();
    if (!q) return ALL_EMOJIS;
    return ALL_EMOJIS.filter(function (e) {
      return e.name.indexOf(q) !== -1;
    });
  }

  _renderItem(info) {
    var e = info.item;
    var self = this;
    var onSelect = this.props.onSelect;
    return (
      <TouchableOpacity
        style={styles.emojiBtn}
        data-type="emoji-item"
        onPress={function () {
          self.setState({ search: '' });
          onSelect(e.name, e.emoji);
        }}
      >
        {IS_ANDROID ? (
          <Image source={{ uri: e.url }} style={styles.emojiImg} />
        ) : (
          <Text style={styles.emojiText}>{e.emoji}</Text>
        )}
      </TouchableOpacity>
    );
  }

  render() {
    var { visible, onSelect, onClose } = this.props;
    var { search } = this.state;
    var self = this;
    var filtered = this.getFiltered();
    var c = getColors();

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={[styles.overlay, { backgroundColor: c.overlayLight }]}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={onClose}
            data-type="overlay"
          />
          <View style={[styles.container, { backgroundColor: c.bgTertiary }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.textSecondary }]}>Emoji</Text>
              <TouchableOpacity onPress={onClose} data-type="text-btn">
                <Text style={[styles.closeBtn, { color: c.textTertiary }]}>Close</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.search, { backgroundColor: c.bg, color: c.textSecondary, borderColor: c.border }]}
              placeholder="Search emoji..."
              placeholderTextColor={c.textPlaceholder}
              value={search}
              onChangeText={function (t) { self.setState({ search: t }); }}
              autoCorrect={false}
            />
            <FlatList
              data={filtered}
              keyExtractor={keyExtractor}
              numColumns={8}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={3}
              removeClippedSubviews={true}
              renderItem={this._renderItem}
              getItemLayout={getItemLayout}
            />
          </View>
        </View>
      </Modal>
    );
  }
}

function keyExtractor(item) { return item.name; }

function getItemLayout(data, index) {
  return { length: 44, offset: 44 * Math.floor(index / 8), index: index };
}

var styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '50%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    fontSize: 14,
  },
  search: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  emojiBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  emojiImg: {
    width: 28,
    height: 28,
  },
});
