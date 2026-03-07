import React, { Component } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  TouchableHighlight,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Header from '../components/Header';
import Icon from '../components/Icon';
import SlackText from '../components/SlackText';
import { formatDateFull, getUserName } from '../utils/format';
import { getColors } from '../theme';

export default class SearchScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      query: '',
      results: [],
      loading: false,
      searched: false,
    };
  }

  async doSearch() {
    var { slack } = this.props;
    var { query } = this.state;
    if (!query.trim()) return;

    this.setState({ loading: true, searched: true });
    try {
      var res = await slack.searchMessages(query.trim());
      var matches = res.messages && res.messages.matches ? res.messages.matches : [];
      this.setState({ results: matches, loading: false });
    } catch (err) {
      this.setState({ results: [], loading: false });
    }
  }

  renderItem(item) {
    var { usersMap, onSelectMessage } = this.props;
    var c = getColors();
    var userName = getUserName(item.user || item.username, usersMap);
    var channelName = item.channel && item.channel.name ? '#' + item.channel.name : '';

    return (
      <TouchableHighlight
        style={[styles.item, { borderBottomColor: c.border }]}
        underlayColor={c.listUnderlay}
        onPress={function () { onSelectMessage && onSelectMessage(item); }}
        data-type="list-item"
      >
        <View>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemUser, { color: c.textSecondary }]}>{userName}</Text>
            <Text style={[styles.itemChannel, { color: c.accentLight }]}>{channelName}</Text>
          </View>
          <SlackText text={item.text} usersMap={usersMap} style={[styles.itemText, { color: c.textSecondary }]} />
          <Text style={[styles.itemTime, { color: c.textTertiary }]}>{formatDateFull(item.ts)}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  render() {
    var { onBack } = this.props;
    var { query, results, loading, searched } = this.state;
    var self = this;
    var c = getColors();

    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <Header title="Search" onBack={onBack} />
        <View style={[styles.searchRow, { borderBottomColor: c.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: c.bgTertiary, color: c.textSecondary, borderColor: c.borderInput }]}
            placeholder="Search messages..."
            placeholderTextColor={c.textPlaceholder}
            value={query}
            onChangeText={function (t) { self.setState({ query: t }); }}
            onSubmitEditing={function () { self.doSearch(); }}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus={true}
          />
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: c.green }]}
            onPress={function () { self.doSearch(); }}
            data-type="btn"
          >
            <Icon name="search" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={c.accent} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={function (item, i) { return item.ts + '_' + i; }}
            renderItem={function (obj) { return self.renderItem(obj.item); }}
            ListEmptyComponent={
              searched ? (
                <View style={styles.center}>
                  <Text style={[styles.emptyText, { color: c.textTertiary }]}>No results</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    );
  }
}

var styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
  },
  searchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 4,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemUser: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemChannel: {
    fontSize: 12,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
  },
  itemTime: {
    fontSize: 11,
    marginTop: 4,
  },
});
