/**
 * SpendTracker — Google Apps Script Backend
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code and paste this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Set "Execute as": Me
 * 7. Set "Who has access": Anyone
 * 8. Click "Deploy" and copy the web app URL
 * 9. Paste the URL into SpendTracker Settings > Cloud Sync
 *
 * The script stores your full app data as JSON and also
 * writes human-readable tabs (Transactions, Accounts) so
 * you can browse your data in the spreadsheet.
 */

// ---- Web App Endpoints ----

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'getData';

    if (action === 'getData') {
      var data = loadData();
      return jsonResponse({ success: true, data: data });
    }

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'SpendTracker connected!' });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || 'saveData';

    if (action === 'saveData') {
      saveData(body.data);
      try {
        writeReadableTabs(body.data);
      } catch (tabErr) {
        // Data is saved in Properties even if sheet tabs fail
        return jsonResponse({ success: true, timestamp: new Date().toISOString(), tabWarning: tabErr.message });
      }
      return jsonResponse({ success: true, timestamp: new Date().toISOString() });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

// ---- Data Storage (uses Script Properties for reliability) ----

function saveData(data) {
  var json = JSON.stringify(data);
  // Script Properties has a 9MB total limit, single property ~500KB
  // For larger data, chunk it
  var props = PropertiesService.getScriptProperties();
  var chunkSize = 400000; // ~400KB per chunk to be safe
  var chunks = Math.ceil(json.length / chunkSize);

  props.setProperty('_chunks', String(chunks));
  for (var i = 0; i < chunks; i++) {
    props.setProperty('_data_' + i, json.substring(i * chunkSize, (i + 1) * chunkSize));
  }
  props.setProperty('_lastUpdated', new Date().toISOString());
}

function loadData() {
  var props = PropertiesService.getScriptProperties();
  var chunksStr = props.getProperty('_chunks');
  if (!chunksStr) return null;

  var chunks = parseInt(chunksStr, 10);
  var json = '';
  for (var i = 0; i < chunks; i++) {
    json += props.getProperty('_data_' + i) || '';
  }

  if (!json) return null;
  return JSON.parse(json);
}

// ---- Human-Readable Tabs ----

function writeReadableTabs(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Write Transactions tab
  if (data.transactions && data.transactions.length > 0) {
    var txnSheet = getOrCreateSheet(ss, 'Transactions');
    var txnHeaders = ['Date', 'Type', 'Amount', 'Merchant', 'Category', 'Note', 'Account', 'Tags'];
    var txnRows = [txnHeaders];

    // Build category lookup
    var catMap = {};
    if (data.categories) {
      data.categories.forEach(function(c) { catMap[c.id] = c.icon + ' ' + c.name; });
    }

    // Build account lookup
    var acctMap = {};
    if (data.accounts) {
      data.accounts.forEach(function(a) { acctMap[a.id] = a.name; });
    }

    // Sort by date descending
    var sorted = data.transactions.slice().sort(function(a, b) {
      return b.date.localeCompare(a.date);
    });

    sorted.forEach(function(t) {
      txnRows.push([
        t.date,
        t.type,
        t.amount,
        t.merchant || '',
        catMap[t.categoryId] || t.categoryId || '',
        t.note || '',
        acctMap[t.fromAccountId] || t.fromAccountId || '',
        (t.tags || []).join(', ')
      ]);
    });

    txnSheet.clearContents();
    txnSheet.getRange(1, 1, txnRows.length, txnHeaders.length).setValues(txnRows);

    // Format header
    txnSheet.getRange(1, 1, 1, txnHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    txnSheet.setFrozenRows(1);
  }

  // Write Accounts tab
  if (data.accounts && data.accounts.length > 0) {
    var acctSheet = getOrCreateSheet(ss, 'Accounts');
    var acctHeaders = ['Name', 'Type', 'Balance', 'Initial Balance'];
    var acctRows = [acctHeaders];

    data.accounts.forEach(function(a) {
      acctRows.push([a.name, a.type, a.balance, a.initialBalance]);
    });

    acctSheet.clearContents();
    acctSheet.getRange(1, 1, acctRows.length, acctHeaders.length).setValues(acctRows);
    acctSheet.getRange(1, 1, 1, acctHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    acctSheet.setFrozenRows(1);
  }

  // Write Categories tab
  if (data.categories && data.categories.length > 0) {
    var catSheet = getOrCreateSheet(ss, 'Categories');
    var catHeaders = ['Icon', 'Name', 'Type'];
    var catRows = [catHeaders];

    data.categories.forEach(function(c) {
      catRows.push([c.icon, c.name, c.type]);
    });

    catSheet.clearContents();
    catSheet.getRange(1, 1, catRows.length, catHeaders.length).setValues(catRows);
    catSheet.getRange(1, 1, 1, catHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    catSheet.setFrozenRows(1);
  }

  // Write Budgets tab
  if (data.budgets && data.budgets.length > 0) {
    var catMap2 = {};
    if (data.categories) {
      data.categories.forEach(function(c) { catMap2[c.id] = c.icon + ' ' + c.name; });
    }

    var budgetSheet = getOrCreateSheet(ss, 'Budgets');
    var budgetHeaders = ['Category', 'Monthly Limit'];
    var budgetRows = [budgetHeaders];

    data.budgets.forEach(function(b) {
      budgetRows.push([catMap2[b.categoryId] || b.categoryId, b.monthlyLimit]);
    });

    budgetSheet.clearContents();
    budgetSheet.getRange(1, 1, budgetRows.length, budgetHeaders.length).setValues(budgetRows);
    budgetSheet.getRange(1, 1, 1, budgetHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    budgetSheet.setFrozenRows(1);
  }

  // Write EMIs tab
  if (data.emis && data.emis.length > 0) {
    var emiSheet = getOrCreateSheet(ss, 'EMIs');
    var emiHeaders = ['Name', 'Lender', 'Total Amount', 'EMI Amount', 'Interest %', 'EMI Date', 'Tenure', 'Remaining', 'Start Date', 'Active'];
    var emiRows = [emiHeaders];

    data.emis.forEach(function(e) {
      emiRows.push([
        e.name, e.lender, e.totalAmount, e.emiAmount, e.interestRate,
        e.emiDate, e.tenureMonths, e.remainingMonths, e.startDate,
        e.active ? 'Yes' : 'No'
      ]);
    });

    emiSheet.clearContents();
    emiSheet.getRange(1, 1, emiRows.length, emiHeaders.length).setValues(emiRows);
    emiSheet.getRange(1, 1, 1, emiHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    emiSheet.setFrozenRows(1);
  }

  // Write SIPs tab
  if (data.sips && data.sips.length > 0) {
    var acctMap2 = {};
    if (data.accounts) {
      data.accounts.forEach(function(a) { acctMap2[a.id] = a.name; });
    }

    var sipSheet = getOrCreateSheet(ss, 'SIPs');
    var sipHeaders = ['Name', 'Amount', 'Frequency', 'SIP Date', 'Type', 'Account', 'Active'];
    var sipRows = [sipHeaders];

    data.sips.forEach(function(s) {
      sipRows.push([
        s.name, s.amount, s.frequency, s.sipDate, s.type,
        acctMap2[s.accountId] || s.accountId || '', s.active ? 'Yes' : 'No'
      ]);
    });

    sipSheet.clearContents();
    sipSheet.getRange(1, 1, sipRows.length, sipHeaders.length).setValues(sipRows);
    sipSheet.getRange(1, 1, 1, sipHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    sipSheet.setFrozenRows(1);
  }

  // Write People tab
  if (data.people && data.people.length > 0) {
    var peopleSheet = getOrCreateSheet(ss, 'People');
    var peopleHeaders = ['Name'];
    var peopleRows = [peopleHeaders];

    data.people.forEach(function(p) {
      peopleRows.push([p.name]);
    });

    peopleSheet.clearContents();
    peopleSheet.getRange(1, 1, peopleRows.length, peopleHeaders.length).setValues(peopleRows);
    peopleSheet.getRange(1, 1, 1, peopleHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    peopleSheet.setFrozenRows(1);
  }

  // Write Settlements tab
  if (data.settlements && data.settlements.length > 0) {
    var acctMap3 = {};
    if (data.accounts) {
      data.accounts.forEach(function(a) { acctMap3[a.id] = a.name; });
    }
    var pplMap = {};
    if (data.people) {
      data.people.forEach(function(p) { pplMap[p.id] = p.name; });
    }

    var settleSheet = getOrCreateSheet(ss, 'Settlements');
    var settleHeaders = ['Date', 'Person', 'Amount', 'From Account', 'To Account'];
    var settleRows = [settleHeaders];

    data.settlements.forEach(function(s) {
      settleRows.push([
        s.date,
        pplMap[s.personId] || s.personId,
        s.amount,
        acctMap3[s.fromAccountId] || s.fromAccountId || '',
        acctMap3[s.toAccountId] || s.toAccountId || ''
      ]);
    });

    settleSheet.clearContents();
    settleSheet.getRange(1, 1, settleRows.length, settleHeaders.length).setValues(settleRows);
    settleSheet.getRange(1, 1, 1, settleHeaders.length)
      .setFontWeight('bold')
      .setBackground('#4a90d9')
      .setFontColor('#ffffff');
    settleSheet.setFrozenRows(1);
  }

  // Write Summary tab
  var summarySheet = getOrCreateSheet(ss, 'Summary');
  var summaryRows = [
    ['SpendTracker Sync Summary', ''],
    ['Last Synced', new Date().toLocaleString()],
    ['', ''],
    ['Total Accounts', data.accounts ? data.accounts.length : 0],
    ['Total Transactions', data.transactions ? data.transactions.length : 0],
    ['Total Categories', data.categories ? data.categories.length : 0],
    ['Total People', data.people ? data.people.length : 0],
    ['Monthly Budget', data.monthlyBudget || 0],
    ['Active EMIs', data.emis ? data.emis.filter(function(e) { return e.active; }).length : 0],
    ['Active SIPs', data.sips ? data.sips.filter(function(s) { return s.active; }).length : 0],
    ['Total Settlements', data.settlements ? data.settlements.length : 0],
    ['Total Budgets', data.budgets ? data.budgets.length : 0],
  ];

  summarySheet.clearContents();
  summarySheet.getRange(1, 1, summaryRows.length, 2).setValues(summaryRows);
  summarySheet.getRange(1, 1, 1, 2).setFontWeight('bold').setFontSize(14);
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ---- Utility ----

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
