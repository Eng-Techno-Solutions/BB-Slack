import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableHighlight,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { EMOJI_MAP } from '../utils/emoji';
import { getColors } from '../theme';

var ALL_EMOJIS = Object.keys(EMOJI_MAP).reduce(function (acc, name) {
  var emoji = EMOJI_MAP[name];
  if (acc.seen[emoji]) return acc;
  acc.seen[emoji] = true;
  acc.list.push({ name: name, emoji: emoji });
  return acc;
}, { list: [], seen: {} }).list;

var IS_ANDROID = Platform.OS === 'android';

export default class EmojiPicker extends Component {
  constructor(props) {
    super(props);
    this.state = { search: '' };
  }

  getFiltered() {
    var q = this.state.search.toLowerCase().trim();
    if (!q) return ALL_EMOJIS;
    return ALL_EMOJIS.filter(function (e) {
      return e.name.indexOf(q) !== -1;
    });
  }

  renderAndroidItem(info) {
    var e = info.item;
    var self = this;
    var c = getColors();
    return (
      <TouchableHighlight
        style={styles.androidRow}
        underlayColor={c.listUnderlay}
        data-type="emoji-item"
        onPress={function () {
          self.setState({ search: '' });
          self.props.onSelect(e.name, e.emoji);
        }}
      >
        <Text style={[styles.androidRowText, { color: c.textSecondary }]}>:{e.name}:</Text>
      </TouchableHighlight>
    );
  }

  renderWebItem(info) {
    var e = info.item;
    var self = this;
    return (
      <TouchableOpacity
        style={styles.emojiBtn}
        data-type="emoji-item"
        onPress={function () {
          self.setState({ search: '' });
          self.props.onSelect(e.name, e.emoji);
        }}
      >
        <Text style={styles.emojiText}>{e.emoji}</Text>
      </TouchableOpacity>
    );
  }

  render() {
    var { visible, onClose } = this.props;
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
              keyExtractor={function (item) { return item.name; }}
              numColumns={IS_ANDROID ? 1 : 8}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={IS_ANDROID ? 20 : 40}
              maxToRenderPerBatch={IS_ANDROID ? 20 : 40}
              windowSize={5}
              renderItem={IS_ANDROID
                ? function (info) { return self.renderAndroidItem(info); }
                : function (info) { return self.renderWebItem(info); }
              }
            />
          </View>
        </View>
      </Modal>
    );
  }
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
  androidRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  androidRowText: {
    fontSize: 15,
  },
});
