import React from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { Colors } from '../constants/colors';
import { TvControlService } from '../services/TvControlService';
import { useDeviceStore } from '../store/deviceStore';
import { normalizePickedPath } from '../utils/selectedDevice';

type RemoteFile = { name: string; size: string; permissions: string };
const remotePath = (folder: string, name: string) => `${folder.replace(/\/$/, '')}/${name}`;
const shellQuote = (value: string) => `'${value.replace(/'/g, "'\\\"'\\\"'")}'`;
const isDirectory = (file: RemoteFile) => file.permissions?.startsWith('d');
const isValidName = (name: string) => name.trim().length > 0 && !/[\\/\0]/.test(name) && name !== '.' && name !== '..';

const FilesScreen: React.FC = () => {
  const { devices } = useDeviceStore();
  const connected = devices.filter(device => device.state === 'Connected');
  const [targetId, setTargetId] = React.useState<string>();
  const [path, setPath] = React.useState('/sdcard/');
  const [folderName, setFolderName] = React.useState('');
  const [files, setFiles] = React.useState<RemoteFile[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [renameFile, setRenameFile] = React.useState<RemoteFile | null>(null);
  const [newName, setNewName] = React.useState('');
  const target = connected.find(device => device.deviceId === targetId) || connected[0];

  React.useEffect(() => { if (target && !targetId) setTargetId(target.deviceId); }, [target, targetId]);

  const refresh = async () => {
    if (!target) return Alert.alert('No TV selected', 'Connect a TV, then select it here.');
    setBusy(true);
    try { setFiles(await TvControlService.listFiles(target.deviceId, path)); }
    catch (error: any) { Alert.alert('File listing failed', error?.message || 'Unable to read TV files.'); }
    finally { setBusy(false); }
  };
  const upload = async () => {
    if (!target) return Alert.alert('No TV selected');
    try {
      const picked = await DocumentPicker.pickSingle({ copyTo: 'cachesDirectory' });
      setBusy(true);
      await TvControlService.pushFile(target.deviceId, normalizePickedPath(picked.fileCopyUri || picked.uri), remotePath(path, picked.name || 'upload.bin'));
      Alert.alert('Upload complete', `File uploaded to ${target.name}.`); await refresh();
    } catch (error: any) { if (!DocumentPicker.isCancel(error)) Alert.alert('Upload failed', error?.message || 'Unable to upload file.'); }
    finally { setBusy(false); }
  };
  const createFolder = async () => {
    const name = folderName.trim();
    if (!target) return Alert.alert('No TV selected');
    if (!isValidName(name)) return Alert.alert('Invalid folder name', 'Use a name without / or \\ characters.');
    setBusy(true);
    try {
      const result = await TvControlService.shell(target.deviceId, `mkdir -p ${shellQuote(remotePath(path, name))}`);
      if (!result.success) throw new Error(result.stderr || result.stdout);
      setFolderName(''); await refresh();
    } catch (error: any) { Alert.alert('Create folder failed', error?.message || 'Unable to create folder.'); }
    finally { setBusy(false); }
  };
  const deleteEntry = (file: RemoteFile) => Alert.alert(isDirectory(file) ? 'Delete folder and its contents?' : 'Delete file?', isDirectory(file) ? `${file.name} and every file/subfolder inside it will be permanently removed.` : file.name, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      if (!target) return; setBusy(true);
      try { await TvControlService.deleteFile(target.deviceId, remotePath(path, file.name)); await refresh(); }
      catch (error: any) { Alert.alert('Delete failed', error?.message || 'Unable to delete item.'); }
      finally { setBusy(false); }
    } },
  ]);
  const startRename = (file: RemoteFile) => { setRenameFile(file); setNewName(file.name); };
  const rename = async () => {
    if (!target || !renameFile) return;
    const name = newName.trim();
    if (!isValidName(name)) return Alert.alert('Invalid name', 'Use a name without / or \\ characters.');
    if (name === renameFile.name) return setRenameFile(null);
    setBusy(true);
    try {
      const result = await TvControlService.shell(target.deviceId, `mv ${shellQuote(remotePath(path, renameFile.name))} ${shellQuote(remotePath(path, name))}`);
      if (!result.success) throw new Error(result.stderr || result.stdout);
      setRenameFile(null); await refresh();
    } catch (error: any) { Alert.alert('Rename failed', error?.message || 'Unable to rename item.'); }
    finally { setBusy(false); }
  };
  const open = (file: RemoteFile) => { if (isDirectory(file)) { setPath(`${remotePath(path, file.name)}/`); setFiles([]); } };
  const goParent = () => { const parts = path.replace(/\/$/, '').split('/'); parts.pop(); setPath(`${parts.join('/') || '/'}${parts.length ? '/' : ''}`); setFiles([]); };

  return <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.header}><Text style={s.title}>File Manager</Text><Text style={s.hint}>Open any folder to upload there, rename items, or delete files and folders.</Text></View>
    <View style={s.card}>
      <Text style={s.label}>CONNECTED TV</Text><View style={s.choices}>{connected.map(device => <TouchableOpacity key={device.deviceId} style={[s.choice, target?.deviceId === device.deviceId && s.choiceActive]} onPress={() => { setTargetId(device.deviceId); setFiles([]); }}><Text style={s.choiceText}>{device.name}</Text></TouchableOpacity>)}</View>
      <Text style={s.label}>CURRENT FOLDER</Text><TextInput value={path} onChangeText={setPath} style={s.input} autoCapitalize="none" />
      <View style={s.row}><TextInput value={folderName} onChangeText={setFolderName} placeholder="New folder name" placeholderTextColor={Colors.textSecondary} style={[s.input, s.flex]} /><TouchableOpacity style={s.smallButton} onPress={createFolder} disabled={busy}><Text style={s.buttonText}>CREATE</Text></TouchableOpacity></View>
    </View>
    <View style={s.actions}><TouchableOpacity style={s.button} onPress={refresh} disabled={busy}><Text style={s.buttonText}>{busy ? 'WORKING…' : 'REFRESH FILES'}</Text></TouchableOpacity><TouchableOpacity style={[s.button, s.secondary]} onPress={upload} disabled={busy}><Text style={s.buttonText}>UPLOAD HERE</Text></TouchableOpacity></View>
    <View style={s.list}>
      {path !== '/sdcard/' && <TouchableOpacity style={s.file} onPress={goParent}><Text style={s.name}>↩ Parent folder</Text></TouchableOpacity>}
      {files.map(file => <View key={file.name} style={s.file}><TouchableOpacity style={s.fileInfo} onPress={() => open(file)} disabled={!isDirectory(file)}><Text style={s.name}>{isDirectory(file) ? '📁 ' : '📄 '}{file.name}</Text><Text style={s.meta}>{file.permissions} · {file.size}{isDirectory(file) ? ' · Tap to open' : ''}</Text></TouchableOpacity><View style={s.fileActions}><TouchableOpacity onPress={() => startRename(file)} disabled={busy}><Text style={s.actionText}>RENAME</Text></TouchableOpacity><TouchableOpacity onPress={() => deleteEntry(file)} disabled={busy}><Text style={s.delete}>DELETE</Text></TouchableOpacity></View></View>)}
    </View>
    <Modal visible={!!renameFile} transparent animationType="fade" onRequestClose={() => setRenameFile(null)}><View style={s.modalBackdrop}><View style={s.modal}><Text style={s.modalTitle}>Rename {renameFile && isDirectory(renameFile) ? 'folder' : 'file'}</Text><TextInput value={newName} onChangeText={setNewName} style={s.input} autoFocus selectTextOnFocus /><View style={s.modalActions}><TouchableOpacity style={[s.modalButton, s.cancelButton]} onPress={() => setRenameFile(null)} disabled={busy}><Text style={s.buttonText}>CANCEL</Text></TouchableOpacity><TouchableOpacity style={s.modalButton} onPress={rename} disabled={busy}><Text style={s.buttonText}>{busy ? 'SAVING…' : 'SAVE'}</Text></TouchableOpacity></View></View></View></Modal>
  </ScrollView>;
};
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, content: { paddingBottom: 36 }, header: { padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border }, title: { fontSize: 24, fontWeight: 'bold', color: Colors.text }, hint: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 }, card: { margin: 16, backgroundColor: Colors.surface, padding: 16, borderRadius: 12 }, label: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6, marginTop: 6 }, choices: { gap: 6, marginBottom: 8 }, choice: { borderWidth: 1, borderColor: Colors.border, padding: 10, borderRadius: 8 }, choiceActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceLight }, choiceText: { color: Colors.text, fontSize: 14 }, input: { color: Colors.text, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 10 }, row: { flexDirection: 'row', gap: 8, marginTop: 10 }, flex: { flex: 1 }, smallButton: { backgroundColor: Colors.primary, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 }, actions: { paddingHorizontal: 16, gap: 8 }, button: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' }, secondary: { backgroundColor: Colors.surfaceLight }, buttonText: { fontSize: 13, fontWeight: '700', color: Colors.text }, list: { padding: 16, gap: 8 }, file: { backgroundColor: Colors.surface, padding: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }, fileInfo: { flex: 1 }, name: { fontSize: 16, color: Colors.text }, meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 }, fileActions: { gap: 12, alignItems: 'flex-end' }, actionText: { fontSize: 11, color: Colors.primary, fontWeight: '700' }, delete: { fontSize: 11, color: '#ef5350', fontWeight: '700' }, modalBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', padding: 24 }, modal: { backgroundColor: Colors.surface, borderRadius: 12, padding: 18 }, modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }, modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 14 }, modalButton: { backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 11, paddingHorizontal: 14 }, cancelButton: { backgroundColor: Colors.surfaceLight },
});
export default FilesScreen;
