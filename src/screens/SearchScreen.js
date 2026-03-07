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
    var userName = getUserName(item.user || item.username, usersMap);
    var channelName = item.channel && item.channel.name ? '#' + item.channel.name : '';

    return (
      <TouchableHighlight
        style={styles.item}
        underlayColor="rgba(18, 100, 163, 0.25)"
        onPress={function () { onSelectMessage && onSelectMessage(item); }}
        data-type="list-item"
      >
        <View>
          <View style={styles.itemHeader}>
            <Text style={styles.itemUser}>{userName}</Text>
            <Text style={styles.itemChannel}>{channelName}</Text>
          </View>
          <SlackText text={item.text} usersMap={usersMap} style={styles.itemText} />
          <Text style={styles.itemTime}>{formatDateFull(item.ts)}</Text>
        </View>
      </TouchableHighlight>
    );
  }

  render() {
    var { onBack } = this.props;
    var { query, results, loading, searched } = this.state;
    var self = this;

    return (
      <View style={styles.container}>
        <Header title="Search" onBack={onBack} />
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Search messages..."
            placeholderTextColor="#696969"
            value={query}
            onChangeText={function (t) { self.setState({ query: t }); }}
            onSubmitEditing={function () { self.doSearch(); }}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus={true}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={function () { self.doSearch(); }}
          >
            <Icon name="search" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#1264A3" />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={function (item, i) { return item.ts + '_' + i; }}
            renderItem={function (obj) { return self.renderItem(obj.item); }}
            ListEmptyComponent={
              searched ? (
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No results</Text>
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
    backgroundColor: '#1A1D21',
  },
  searchRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  input: {
    flex: 1,
    backgroundColor: '#222529',
    color: '#D1D2D3',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#565856',
    marginRight: 8,
  },
  searchBtn: {
    backgroundColor: '#007A5A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 4,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#ABABAD',
    fontSize: 14,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#383838',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemUser: {
    color: '#D1D2D3',
    fontSize: 14,
    fontWeight: 'bold',
  },
  itemChannel: {
    color: '#1D9BD1',
    fontSize: 12,
  },
  itemText: {
    color: '#D1D2D3',
    fontSize: 14,
    lineHeight: 20,
  },
  itemTime: {
    color: '#ABABAD',
    fontSize: 11,
    marginTop: 4,
  },
});
