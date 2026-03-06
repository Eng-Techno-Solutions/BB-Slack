export function formatTime(ts) {
  var date = new Date(parseFloat(ts) * 1000);
  var hours = date.getHours();
  var mins = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  var m = mins < 10 ? '0' + mins : '' + mins;
  return hours + ':' + m + ' ' + ampm;
}

export function formatDate(ts) {
  var date = new Date(parseFloat(ts) * 1000);
  var now = new Date();
  var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  var diff = (today - msgDate) / (1000 * 60 * 60 * 24);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear();
}

export function formatDateFull(ts) {
  return formatDate(ts) + ' at ' + formatTime(ts);
}

export function getUserName(user, usersMap) {
  if (!user) return 'Unknown';
  var u = usersMap[user];
  if (!u) return user;
  return u.profile && u.profile.display_name
    ? u.profile.display_name
    : u.real_name || u.name || user;
}

export function getChannelDisplayName(channel, usersMap, currentUserId) {
  if (channel.is_im) {
    return getUserName(channel.user, usersMap);
  }
  if (channel.is_mpim) {
    return channel.purpose && channel.purpose.value
      ? channel.purpose.value
      : channel.name_normalized || channel.name;
  }
  return channel.name_normalized || channel.name;
}
