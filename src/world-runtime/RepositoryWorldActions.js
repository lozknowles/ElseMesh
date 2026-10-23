// Every user-initiated world change shares the portal transfer guard.
export function repositoryWorldActions({host,portals,report=()=>{}}){
 const idle=()=>{if(portals.pending)throw Error('Wait for the portal transfer to finish.');};
 return {
  async load(source,options){idle();portals.disconnect();report('Validating and building candidate world…');try{return await host.load(source,options);}catch(error){report('World rejected: '+error.message);throw error;}},
  checkUpdate(options){idle();return host.checkUpdate(options);},
  applyUpdate(){idle();portals.disconnect();return host.applyUpdate();},
 };
}
