// Explicit standalone source operations and authenticated connection establishment cannot overlap.
export function repositoryWorldActions({host,portals,report=()=>{}}){
 const idle=()=>{if(portals.pending)throw Error('Wait for the portal transfer to finish.');if(portals.connectionPending||portals.sourceLoading)throw Error('Wait for the current world connection or source operation to finish.');};
 const begin=()=>{idle();portals.sourceLoading=true;portals.disconnect();};
 const activateLocal=loaded=>{if(loaded){portals.config=null;portals.releaseOfflineResources?.();host.input?.resume?.();}return loaded;};
 return {
  async load(source,options){begin();report('Validating and building candidate world…');try{return activateLocal(await host.load(source,options));}catch(error){report('World rejected: '+error.message);throw error;}finally{portals.sourceLoading=false;}},
  checkUpdate(options){idle();return host.checkUpdate(options);},
  applyUpdate(){begin();try{return Promise.resolve(host.applyUpdate()).then(activateLocal).finally(()=>{portals.sourceLoading=false;});}catch(error){portals.sourceLoading=false;throw error;}},
 };
}
